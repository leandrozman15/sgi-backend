import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  async verifyToken(token: string) {
    try {
      return await admin.auth().verifyIdToken(token);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }
}
