import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator'; // ✅ Importar

@Controller('health')
export class HealthController {
  @Get()
  @Public() // ✅ Hacer público para health checks
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      service: 'sgi-backend',
      environment: process.env.NODE_ENV || 'development'
    };
  }
}
