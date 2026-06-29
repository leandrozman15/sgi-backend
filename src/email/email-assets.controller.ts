import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { FLUXION_LOGO_BASE64 } from './fluxion-logo';
import { Public } from '../auth/decorators/public.decorator';

@Controller('assets/email')
export class EmailAssetsController {
  private readonly logoBuffer = Buffer.from(FLUXION_LOGO_BASE64, 'base64');

  @Public()
  @Get('logo.png')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=86400, immutable')
  getLogo(@Res() res: Response) {
    res.send(this.logoBuffer);
  }
}
