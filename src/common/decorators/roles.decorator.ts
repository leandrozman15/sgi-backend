import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../types/roles';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
