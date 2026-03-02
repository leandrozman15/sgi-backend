import { Inject, Injectable, Logger, Optional, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as admin from 'firebase-admin';
import { UserRole } from '../types/roles';

@Injectable()
export class EmployeeService {
  private prisma: PrismaService;
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    prisma: PrismaService,
    @Optional() @Inject('FIREBASE_APP') private readonly firebaseApp?: admin.app.App,
    @Optional() @Inject('FIREBASE_AUTH') private readonly firebaseAuth?: admin.auth.Auth,
  ) {
    this.prisma = prisma;
  }

  private getFirebaseAuth(): admin.auth.Auth | null {
    if (this.firebaseAuth) return this.firebaseAuth;
    if (this.firebaseApp) return this.firebaseApp.auth();
    return null;
  }

  private normalizeEmail(value: any): string {
    return String(value || '').trim().toLowerCase();
  }

  private getPermissionsForRole(role: UserRole): string[] {
    const permissionsMap: Record<UserRole, string[]> = {
      [UserRole.MASTER]: ['*:*'],
      [UserRole.ADMIN]: ['companies:read', 'companies:write', 'companies:delete', 'users:manage', 'users:read', 'users:write'],
      [UserRole.GERENTE]: ['production:read', 'production:write', 'reports:read'],
      [UserRole.SUPERVISOR]: ['production:read', 'production:write', 'quality:read'],
      [UserRole.OPERADOR]: ['production:read', 'production:write', 'tasks:read'],
      [UserRole.CONSULTOR]: ['reports:read', 'production:read', 'dashboards:read'],
    };
    return permissionsMap[role] || [];
  }

  private resolveUserRole(employee: any): UserRole {
    const rawRole = String(employee?.role || employee?.accessLevel || employee?.department || '').trim().toLowerCase();

    if (rawRole.includes('master')) return UserRole.MASTER;
    if (rawRole.includes('admin')) return UserRole.ADMIN;
    if (rawRole.includes('gerente') || rawRole.includes('manager')) return UserRole.GERENTE;
    if (rawRole.includes('supervisor')) return UserRole.SUPERVISOR;
    if (rawRole.includes('operador') || rawRole.includes('operator')) return UserRole.OPERADOR;
    return UserRole.CONSULTOR;
  }

  private async ensureFirebaseAuthForEmployee(employee: any, payload: any, companyId: string): Promise<string | null> {
    const hasAccess = !!employee?.hasAccess;
    if (!hasAccess) return null;

    const auth = this.getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth não inicializado no backend.');
    }

    const email = this.normalizeEmail(employee?.email || payload?.email);
    if (!email) {
      throw new Error('Funcionário com acesso ao sistema precisa de email válido.');
    }

    const role = this.resolveUserRole(employee);
    const permissions = this.getPermissionsForRole(role);

    let userRecord: admin.auth.UserRecord | null = null;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error?.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    if (!userRecord) {
      const authPassword = String(payload?.authPassword || '').trim();
      if (!authPassword || authPassword.length < 6) {
        throw new Error('Senha de acesso obrigatória (mínimo 6 caracteres) para criar usuário no Firebase Auth.');
      }

      userRecord = await auth.createUser({
        email,
        password: authPassword,
        displayName: String(employee?.name || 'Funcionário').trim() || undefined,
        disabled: false,
      });
    } else {
      const authPassword = String(payload?.authPassword || '').trim();
      const updatePayload: admin.auth.UpdateRequest = {
        email,
        displayName:
          String(employee?.name || userRecord.displayName || '').trim() ||
          userRecord.displayName ||
          undefined,
        disabled: false,
      };

      if (authPassword && authPassword.length >= 6) {
        updatePayload.password = authPassword;
      }

      await auth.updateUser(userRecord.uid, updatePayload);
    }

    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      companyId,
      permissions,
    });

    return userRecord.uid;
  }

  private async disableFirebaseAuthForEmployee(employee: any): Promise<void> {
    const auth = this.getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase Auth não inicializado no backend.');
    }

    const email = this.normalizeEmail(employee?.email);
    if (!email) return;

    try {
      const userRecord = await auth.getUserByEmail(email);
      await auth.updateUser(userRecord.uid, { disabled: true });
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') return;
      throw error;
    }
  }

  private getEmployeeDocRef(companyId: string, employeeId: string) {
    if (!this.firebaseApp) return null;
    return this.firebaseApp
      .firestore()
      .collection('companies')
      .doc(companyId)
      .collection('employees')
      .doc(employeeId);
  }

  private mapEmployeeToFirestore(employee: any, companyId: string) {
    return {
      id: employee.id,
      companyId,
      name: employee.name ?? null,
      email: employee.email ?? null,
      document: employee.document ?? employee.cpf ?? null,
      cpf: employee.cpf ?? employee.document ?? null,
      role: employee.role ?? employee.position ?? null,
      accessLevel: employee.accessLevel ?? employee.department ?? null,
      position: employee.position ?? employee.role ?? null,
      department: employee.department ?? employee.accessLevel ?? null,
      status: employee.status ?? null,
      hasAccess: employee.hasAccess ?? (employee.status === 'active'),
      phone: employee.phone ?? null,
      address: employee.address ?? null,
      commission: employee.commission ?? null,
      registrationNumber: employee.registrationNumber ?? null,
      startDate: employee.startDate ?? null,
      vacationDays: employee.vacationDays ?? null,
      banco: employee.banco ?? null,
      conta: employee.conta ?? null,
      pix: employee.pix ?? null,
      tamanhoCamisa: employee.tamanhoCamisa ?? null,
      tamanhoCalca: employee.tamanhoCalca ?? null,
      numeroBotas: employee.numeroBotas ?? null,
      firebaseUid: employee.firebaseUid ?? null,
      permissions: employee.permissions ?? {},
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  private async syncEmployeeToFirestore(employee: any, companyId: string, isCreate = false) {
    const ref = this.getEmployeeDocRef(companyId, employee.id);
    if (!ref) {
      throw new Error('Firebase não inicializado no backend (FIREBASE_APP indisponível).');
    }

    const payload = this.mapEmployeeToFirestore(employee, companyId) as any;
    if (isCreate) {
      payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    await ref.set(payload, { merge: true });
  }

  private async removeEmployeeFromFirestore(companyId: string, employeeId: string) {
    const ref = this.getEmployeeDocRef(companyId, employeeId);
    if (!ref) {
      throw new Error('Firebase não inicializado no backend (FIREBASE_APP indisponível).');
    }
    await ref.delete();
  }

  private normalizeExtraData(input: any): Record<string, any> {
    const base = input?.data && typeof input.data === 'object' ? input.data : {};

    return {
      ...base,
      ...(input?.role !== undefined ? { role: input.role } : {}),
      ...(input?.accessLevel !== undefined ? { accessLevel: input.accessLevel } : {}),
      ...(input?.phone !== undefined ? { phone: input.phone } : {}),
      ...(input?.address !== undefined ? { address: input.address } : {}),
      ...(input?.commission !== undefined ? { commission: input.commission } : {}),
      ...(input?.hasAccess !== undefined ? { hasAccess: !!input.hasAccess } : {}),
      ...(input?.cpf !== undefined ? { cpf: input.cpf } : {}),
      ...(input?.registrationNumber !== undefined ? { registrationNumber: input.registrationNumber } : {}),
      ...(input?.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input?.vacationDays !== undefined ? { vacationDays: input.vacationDays } : {}),
      ...(input?.banco !== undefined ? { banco: input.banco } : {}),
      ...(input?.conta !== undefined ? { conta: input.conta } : {}),
      ...(input?.pix !== undefined ? { pix: input.pix } : {}),
      ...(input?.tamanhoCamisa !== undefined ? { tamanhoCamisa: input.tamanhoCamisa } : {}),
      ...(input?.tamanhoCalca !== undefined ? { tamanhoCalca: input.tamanhoCalca } : {}),
      ...(input?.numeroBotas !== undefined ? { numeroBotas: input.numeroBotas } : {}),
      ...(input?.permissions !== undefined ? { permissions: input.permissions } : {}),
    };
  }

  private toClientEmployee(entity: any) {
    const extra = entity?.data && typeof entity.data === 'object' ? entity.data : {};

    return {
      ...entity,
      role: entity.role ?? extra.role ?? entity.position ?? null,
      accessLevel: entity.access_level ?? extra.accessLevel ?? entity.department ?? null,
      phone: entity.phone ?? extra.phone ?? null,
      address: entity.address ?? extra.address ?? null,
      commission: entity.commission ?? extra.commission ?? null,
      hasAccess: entity.has_access ?? extra.hasAccess ?? (entity.status === 'active'),
      cpf: entity.cpf ?? extra.cpf ?? entity.document ?? null,
      registrationNumber: entity.registration_number ?? extra.registrationNumber ?? null,
      startDate: entity.start_date ?? extra.startDate ?? null,
      vacationDays: entity.vacation_days ?? extra.vacationDays ?? null,
      banco: entity.banco ?? extra.banco ?? null,
      conta: entity.conta ?? extra.conta ?? null,
      pix: entity.pix ?? extra.pix ?? null,
      tamanhoCamisa: entity.tamanho_camisa ?? extra.tamanhoCamisa ?? null,
      tamanhoCalca: entity.tamanho_calca ?? extra.tamanhoCalca ?? null,
      numeroBotas: entity.numero_botas ?? extra.numeroBotas ?? null,
      firebaseUid: extra.firebaseUid ?? null,
      permissions: entity.permissions ?? extra.permissions ?? {},
    };
  }

  async findByCompany(companyId: string) {
    if (!companyId) {
      return [];
    }

    const rows = await (this.prisma as any).employees.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    return Array.isArray(rows) ? rows.map((row: any) => this.toClientEmployee(row)) : [];
  }

  async findById(id: string, companyId: string) {
    if (!companyId) {
      return null;
    }

    const row = await (this.prisma as any).employees.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    return row ? this.toClientEmployee(row) : null;
  }

  async createItem(data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const extra = this.normalizeExtraData(data);
    const role = data?.role ?? extra.role ?? null;
    const accessLevel = data?.accessLevel ?? extra.accessLevel ?? null;
    const hasAccess = data?.hasAccess !== undefined ? !!data.hasAccess : extra.hasAccess;
    const startDateRaw = data?.startDate ?? extra.startDate;
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const normalizedStartDate = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;

    const created = await (this.prisma as any).employees.create({
      data: {
        name: data?.name,
        email: data?.email ?? null,
        document: data?.document ?? data?.cpf ?? null,
        cpf: data?.cpf ?? extra.cpf ?? null,
        role: role,
        access_level: accessLevel,
        position: data?.position ?? role ?? null,
        department: data?.department ?? accessLevel ?? null,
        status:
          data?.status ??
          (hasAccess !== undefined ? (hasAccess ? 'active' : 'inactive') : null),
        has_access: hasAccess ?? null,
        commission:
          data?.commission !== undefined || extra.commission !== undefined
            ? Number(data?.commission ?? extra.commission ?? 0)
            : null,
        phone: data?.phone ?? extra.phone ?? null,
        address: data?.address ?? extra.address ?? null,
        registration_number: data?.registrationNumber ?? extra.registrationNumber ?? null,
        start_date: normalizedStartDate,
        vacation_days:
          data?.vacationDays !== undefined || extra.vacationDays !== undefined
            ? Number(data?.vacationDays ?? extra.vacationDays ?? 0)
            : null,
        banco: data?.banco ?? extra.banco ?? null,
        conta: data?.conta ?? extra.conta ?? null,
        pix: data?.pix ?? extra.pix ?? null,
        tamanho_camisa: data?.tamanhoCamisa ?? extra.tamanhoCamisa ?? null,
        tamanho_calca: data?.tamanhoCalca ?? extra.tamanhoCalca ?? null,
        numero_botas: data?.numeroBotas ?? extra.numeroBotas ?? null,
        permissions: data?.permissions ?? extra.permissions ?? {},
        data: Object.keys(extra).length > 0 ? extra : undefined,
        company_id: companyId,
      },
    });

    const createdEmployee = this.toClientEmployee(created);

    try {
      const firebaseUid = await this.ensureFirebaseAuthForEmployee(createdEmployee, data, companyId);
      if (firebaseUid) {
        createdEmployee.firebaseUid = firebaseUid;
      }
    } catch (error: any) {
      this.logger.error(`Falha ao criar usuário Firebase Auth para funcionário ${createdEmployee.id}: ${error?.message || error}`);
      throw new Error(error?.message || 'Funcionário criado no banco, mas falhou a criação no Firebase Auth.');
    }

    try {
      await this.syncEmployeeToFirestore(createdEmployee, companyId, true);
    } catch (error: any) {
      this.logger.error(`Falha ao sincronizar funcionário ${createdEmployee.id} no Firebase: ${error?.message || error}`);
      throw new Error('Funcionário criado no banco, mas falhou a sincronização com Firebase.');
    }

    return createdEmployee;
  }

  async updateItem(id: string, data: any, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await (this.prisma as any).employees.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    const extra = {
      ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
      ...this.normalizeExtraData(data),
    };

    const role = data?.role ?? extra.role;
    const accessLevel = data?.accessLevel ?? extra.accessLevel;
    const hasAccess = data?.hasAccess !== undefined ? !!data.hasAccess : extra.hasAccess;
    const startDateRaw = data?.startDate ?? extra.startDate;
    const startDate = startDateRaw ? new Date(startDateRaw) : null;
    const normalizedStartDate = startDate && !Number.isNaN(startDate.getTime()) ? startDate : null;

    const updated = await (this.prisma as any).employees.update({
      where: { id },
      data: {
        ...(data?.name !== undefined ? { name: data.name } : {}),
        ...(data?.email !== undefined ? { email: data.email } : {}),
        ...(data?.document !== undefined || data?.cpf !== undefined
          ? { document: data?.document ?? data?.cpf ?? null }
          : {}),
        ...(data?.position !== undefined || role !== undefined
          ? { position: data?.position ?? role ?? null }
          : {}),
        ...(data?.department !== undefined || accessLevel !== undefined
          ? { department: data?.department ?? accessLevel ?? null }
          : {}),
        ...(data?.cpf !== undefined || extra.cpf !== undefined
          ? { cpf: data?.cpf ?? extra.cpf ?? null }
          : {}),
        ...(data?.role !== undefined || extra.role !== undefined
          ? { role: data?.role ?? extra.role ?? null }
          : {}),
        ...(data?.accessLevel !== undefined || extra.accessLevel !== undefined
          ? { access_level: data?.accessLevel ?? extra.accessLevel ?? null }
          : {}),
        ...(data?.status !== undefined
          ? { status: data.status }
          : hasAccess !== undefined
            ? { status: hasAccess ? 'active' : 'inactive' }
            : {}),
        ...(data?.hasAccess !== undefined || extra.hasAccess !== undefined
          ? { has_access: hasAccess ?? null }
          : {}),
        ...(data?.commission !== undefined || extra.commission !== undefined
          ? { commission: Number(data?.commission ?? extra.commission ?? 0) }
          : {}),
        ...(data?.phone !== undefined || extra.phone !== undefined
          ? { phone: data?.phone ?? extra.phone ?? null }
          : {}),
        ...(data?.address !== undefined || extra.address !== undefined
          ? { address: data?.address ?? extra.address ?? null }
          : {}),
        ...(data?.registrationNumber !== undefined || extra.registrationNumber !== undefined
          ? { registration_number: data?.registrationNumber ?? extra.registrationNumber ?? null }
          : {}),
        ...(data?.startDate !== undefined || extra.startDate !== undefined
          ? { start_date: normalizedStartDate }
          : {}),
        ...(data?.vacationDays !== undefined || extra.vacationDays !== undefined
          ? { vacation_days: Number(data?.vacationDays ?? extra.vacationDays ?? 0) }
          : {}),
        ...(data?.banco !== undefined || extra.banco !== undefined
          ? { banco: data?.banco ?? extra.banco ?? null }
          : {}),
        ...(data?.conta !== undefined || extra.conta !== undefined
          ? { conta: data?.conta ?? extra.conta ?? null }
          : {}),
        ...(data?.pix !== undefined || extra.pix !== undefined
          ? { pix: data?.pix ?? extra.pix ?? null }
          : {}),
        ...(data?.tamanhoCamisa !== undefined || extra.tamanhoCamisa !== undefined
          ? { tamanho_camisa: data?.tamanhoCamisa ?? extra.tamanhoCamisa ?? null }
          : {}),
        ...(data?.tamanhoCalca !== undefined || extra.tamanhoCalca !== undefined
          ? { tamanho_calca: data?.tamanhoCalca ?? extra.tamanhoCalca ?? null }
          : {}),
        ...(data?.numeroBotas !== undefined || extra.numeroBotas !== undefined
          ? { numero_botas: data?.numeroBotas ?? extra.numeroBotas ?? null }
          : {}),
        ...(data?.permissions !== undefined || extra.permissions !== undefined
          ? { permissions: data?.permissions ?? extra.permissions ?? {} }
          : {}),
        data: Object.keys(extra).length > 0 ? extra : undefined,
      },
    });

    const updatedEmployee = this.toClientEmployee(updated);

    try {
      if (updatedEmployee.hasAccess) {
        const firebaseUid = await this.ensureFirebaseAuthForEmployee(updatedEmployee, data, companyId);
        if (firebaseUid) {
          updatedEmployee.firebaseUid = firebaseUid;
        }
      } else {
        await this.disableFirebaseAuthForEmployee(updatedEmployee);
      }
    } catch (error: any) {
      this.logger.error(`Falha ao sincronizar Firebase Auth para funcionário ${updatedEmployee.id}: ${error?.message || error}`);
      throw new Error(error?.message || 'Funcionário atualizado no banco, mas falhou a sincronização no Firebase Auth.');
    }

    try {
      await this.syncEmployeeToFirestore(updatedEmployee, companyId);
    } catch (error: any) {
      this.logger.error(`Falha ao atualizar funcionário ${updatedEmployee.id} no Firebase: ${error?.message || error}`);
      throw new Error('Funcionário atualizado no banco, mas falhou a sincronização com Firebase.');
    }

    return updatedEmployee;
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) {
      throw new NotFoundException('Empresa não encontrada');
    }

    const existing = await (this.prisma as any).employees.findFirst({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    const existingEmployee = this.toClientEmployee(existing);

    const deleted = await this.prisma.employees.deleteMany({
      where: {
        id,
        company_id: companyId,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    try {
      if (existingEmployee?.hasAccess) {
        await this.disableFirebaseAuthForEmployee(existingEmployee);
      }
    } catch (error: any) {
      this.logger.error(`Falha ao desabilitar usuário Firebase Auth do funcionário ${id}: ${error?.message || error}`);
      throw new Error('Funcionário removido no banco, mas falhou a desativação no Firebase Auth.');
    }

    try {
      await this.removeEmployeeFromFirestore(companyId, id);
    } catch (error: any) {
      this.logger.error(`Falha ao remover funcionário ${id} do Firebase: ${error?.message || error}`);
      throw new Error('Funcionário removido no banco, mas falhou a remoção no Firebase.');
    }

    return { id };
  }
}
