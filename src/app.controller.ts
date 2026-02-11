import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseAuthGuard } from './auth/firebase-auth.guard';
import { User } from './auth/user.decorator';
import { Public } from "./auth/decorators/public.decorator";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  health() {
    return { ok: true };
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('me')
  me(@User() user: { uid: string; email: string | null }) {
    return user;
  }
}
