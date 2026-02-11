import { Injectable, ConflictException, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getAdminAuth } from "../lib/firebase-admin";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class InternalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async listUsers() {
    const auth = getAdminAuth();
    const usersResult = await auth.listUsers(100);
    return usersResult.users.map(u => ({
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      providers: u.providerData.map(p => p.providerId),
      createdAt: u.metadata.creationTime,
      lastLogin: u.metadata.lastSignInTime,
    }));
  }

  async listCompanies() {
    return this.prisma.company.findMany({
      include: {
        memberships: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async bootstrapCompany(dto: {
    companyName: string;
    adminEmail: string;
    adminName?: string;
    cnpj?: string;
  }) {
    const auth = getAdminAuth();
    let firebaseUser;

    try {
      firebaseUser = await auth.getUserByEmail(dto.adminEmail);
    } catch (e: any) {
      if (e.code === "auth/user-not-found") {
        firebaseUser = await auth.createUser({
          email: dto.adminEmail,
          displayName: dto.adminName,
        });
      } else {
        throw new InternalServerErrorException("Erro ao processar usuário no Firebase.");
      }
    }

    const uid = firebaseUser.uid;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { id: uid },
        create: { id: uid, email: dto.adminEmail },
        update: { email: dto.adminEmail },
      });

      const company = await tx.company.create({
        data: { 
          name: dto.companyName,
          data: {
            cnpj: dto.cnpj || null,
            bootstrapAt: new Date().toISOString()
          },
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          companyId: company.id,
          roles: ["owner", "admin"],
        },
      });

      return { company, user, membership };
    });

    const publicUrl = this.config.get<string>("APP_PUBLIC_URL") || "http://localhost:3000";
    const resetLink = await auth.generatePasswordResetLink(dto.adminEmail, {
      url: publicUrl,
    });

    return {
      success: true,
      companyId: result.company.id,
      companyName: result.company.name,
      adminUid: uid,
      adminEmail: dto.adminEmail,
      resetLink,
    };
  }
}
