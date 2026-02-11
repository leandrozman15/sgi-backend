import { Injectable, ConflictException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { getAdminDb } from "../lib/firestore-admin";
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

    // 1) Postgres Transaction: user upsert + company create + membership admin
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { id: uid },
        create: { id: uid, email },
        update: { email },
      });

      const company = await tx.company.create({
        data: { name: dto.name.trim() },
      });

      try {
        const membership = await tx.membership.create({
          data: {
            userId: user.id,
            companyId: company.id,
            roles: [ADMIN_ROLE],
          },
        });

        return { company, membership };
      } catch (e: any) {
        if (e?.code === "P2002") {
          throw new ConflictException("Membership already exists for this user/company.");
        }
        throw e;
      }
    });

    const companyId = result.company.id;

    // 2) Firestore Sync: Cria o membership no NoSQL para as regras de segurança do frontend
    const db = getAdminDb();
    
    // Cria documento de membresia: /companies/{companyId}/users/{uid}
    await db.doc(`companies/${companyId}/users/${uid}`).set(
      {
        uid,
        email,
        roles: [ADMIN_ROLE],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Atualiza o perfil global do usuário com a empresa ativa
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

    // Garantiza que el user exista en Postgres
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
