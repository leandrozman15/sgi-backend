import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { getAdminDb } from "../../lib/firestore-admin";
import * as admin from "firebase-admin";

type AuthUser = { uid: string; email?: string | null };

const ADMIN_ROLE = "admin";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async createCompany(authUser: AuthUser, dto: CreateCompanyDto) {
    const { uid, email } = authUser;

    if (!email) {
      throw new UnauthorizedException("Token Firebase sem email. Por favor, reautentique com e-mail/senha.");
    }

    const name = (dto?.name ?? "").trim();
    if (!name) throw new BadRequestException("name is required");
    if (name.length > 120) throw new BadRequestException("name is too long (max 120)");

    // 1. Persistência Atômica no PostgreSQL
    // Company.id e Membership.id são gerados automaticamente pelo Prisma (@default(cuid()))
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { id: uid },
        create: { id: uid, email },
        update: { email },
      });

      const company = await tx.company.create({
        data: { name },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          companyId: company.id,
          roles: [ADMIN_ROLE],
        },
      });

      return { company, membership };
    });

    const companyId = result.company.id;

    // 2. Sincronização com Firestore (Necessário para Security Rules do Frontend)
    const db = getAdminDb();
    
    await db.doc(`companies/${companyId}/users/${uid}`).set(
      {
        uid,
        email,
        roles: [ADMIN_ROLE],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await db.doc(`profiles/${uid}`).set(
      {
        uid,
        email,
        activeCompanyId: companyId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      id: result.company.id,
      name: result.company.name,
      roles: result.membership.roles,
    };
  }

  async listCompanies(authUser: AuthUser) {
    const { uid, email } = authUser;

    if (!email) {
      throw new UnauthorizedException("Token Firebase sem email. Por favor, reautentique com e-mail/senha.");
    }

    await this.prisma.user.upsert({
      where: { id: uid },
      create: { id: uid, email },
      update: { email },
    });

    const memberships = await this.prisma.membership.findMany({
      where: { userId: uid },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    });

    return memberships.map((m) => ({
      id: m.company.id,
      name: m.company.name,
      roles: m.roles,
    }));
  }
}
