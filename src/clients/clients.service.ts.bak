import { Injectable } from '@nestjs/common';
import { BaseService } from '../database/base.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ClientService extends BaseService {
  constructor(protected db: DatabaseService) {
    super(db);
    this.tableName = 'Client';
  }

  // Métodos específicos podem ser adicionados aqui
}
