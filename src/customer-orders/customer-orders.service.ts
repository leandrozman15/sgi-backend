import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { ProductionOrderService } from '../production-orders/production-orders.service';
import { PurchaseOrderService } from '../purchase-orders/purchase-orders.service';
import { NumberSequenceService } from '../number-sequences/number-sequences.service';

type Item = {
  id?: string;
  productId?: string | null;
  sku?: string | null;
  descricao?: string;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;
  sourceType?: 'estoque' | 'producir' | 'comprar' | null;
  linkedProductionOrderId?: string | null;
  linkedPurchaseOrderId?: string | null;
  status?: string;
  estoqueDisponivel?: number;
  faltante?: number;
};

const STATUS_RASCUNHO = 'RASCUNHO';
const STATUS_APROVADO_EMBALAGEM = 'APROVADO_EMBALAGEM';

@Injectable()
export class CustomerOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productionOrders: ProductionOrderService,
    private readonly purchaseOrders: PurchaseOrderService,
    private readonly numberSequences: NumberSequenceService,
  ) {}

  // ──────────────────────────── helpers ───────────────────────────────────
  private normalizeData(input: any): Record<string, any> {
    if (input?.data && typeof input.data === 'object') return input.data;
    const { id, companyId, createdAt, updatedAt, ...rest } = input || {};
    return rest;
  }

  private toClient(entity: any) {
    const extra =
      entity?.data && typeof entity.data === 'object' ? entity.data : {};
    return {
      ...entity,
      ...extra,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private ensureItemsHaveIds(items: any[]): Item[] {
    if (!Array.isArray(items)) return [];
    return items.map((it) => ({
      ...it,
      id: it?.id || randomUUID(),
      status: it?.status || 'PENDENTE',
    }));
  }

  private computeTotals(items: Item[]) {
    const qtd = items.reduce((s, i) => s + Number(i.quantidade || 0), 0);
    const valor = items.reduce(
      (s, i) => s + Number(i.valorTotal ?? Number(i.quantidade || 0) * Number(i.valorUnitario || 0)),
      0,
    );
    return { qtd, valor };
  }

  // ──────────────────────────── CRUD ──────────────────────────────────────
  async findByCompany(companyId: string) {
    if (!companyId) return [];
    const rows = await this.prisma.customer_orders.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toClient(r));
  }

  async findById(id: string, companyId: string) {
    if (!companyId) return null;
    const row = await this.prisma.customer_orders.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    return row ? this.toClient(row) : null;
  }

  async createItem(payload: any, companyId: string) {
    if (!companyId) throw new NotFoundException('Empresa não encontrada');

    const normalized = this.normalizeData(payload);
    const itens = this.ensureItemsHaveIds(normalized.itens || normalized.items || []);
    const totals = this.computeTotals(itens);

    // Auto-allocate sequential numero if not provided.
    let numero = normalized.numero || normalized.numeroPedido || null;
    if (!numero) {
      try {
        const allocated = await this.numberSequences.allocate(
          companyId,
          'customer_order',
          null,
        );
        numero = allocated.formatted;
      } catch {
        // fall back to undefined; UI will show id slice
      }
    }

    const data = {
      ...normalized,
      ...(numero ? { numero } : {}),
      itens,
      totals,
      status: normalized.status || STATUS_RASCUNHO,
    };

    const created = await this.prisma.customer_orders.create({
      data: {
        id: randomUUID(),
        companyId,
        data,
        updatedAt: new Date(),
      },
    });

    return this.toClient(created);
  }

  async updateItem(id: string, payload: any, companyId: string) {
    if (!companyId) throw new NotFoundException('Empresa não encontrada');

    const existing = await this.prisma.customer_orders.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Orden de Pedido não encontrada');

    const existingData =
      existing.data && typeof existing.data === 'object'
        ? (existing.data as Record<string, any>)
        : {};
    const merged: Record<string, any> = {
      ...existingData,
      ...this.normalizeData(payload),
    };

    if (merged.itens || merged.items) {
      merged.itens = this.ensureItemsHaveIds(merged.itens || merged.items);
      delete merged.items;
      merged.totals = this.computeTotals(merged.itens);
    }

    const updated = await this.prisma.customer_orders.update({
      where: { id },
      data: { data: merged, updatedAt: new Date() },
    });

    return this.toClient(updated);
  }

  async deleteItem(id: string, companyId: string) {
    if (!companyId) throw new NotFoundException('Empresa não encontrada');
    const deleted = await this.prisma.customer_orders.updateMany({
      where: { id, companyId, deletedAt: null },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    if (deleted.count === 0)
      throw new NotFoundException('Orden de Pedido não encontrada');
    return { id };
  }

  // ──────────────────────────── stock check ───────────────────────────────
  async checkStock(id: string, companyId: string) {
    const order = await this.findById(id, companyId);
    if (!order) throw new NotFoundException('Orden de Pedido não encontrada');

    const itens: Item[] = Array.isArray(order.itens) ? order.itens : [];
    const productIds = itens
      .map((i) => i.productId)
      .filter((p): p is string => !!p);

    const products = productIds.length
      ? await this.prisma.products.findMany({
          where: { id: { in: productIds }, company_id: companyId },
          select: { id: true, current_stock: true, type: true, data: true },
        })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));

    const updatedItens = itens.map((it) => {
      const p = it.productId ? byId.get(it.productId) : undefined;
      const disponivel = Number(p?.current_stock ?? 0);
      const qtd = Number(it.quantidade || 0);
      const faltante = Math.max(qtd - disponivel, 0);

      let isRevenda = false;
      const pdata = (p?.data as any) || {};
      if (typeof pdata.isRevenda === 'boolean') isRevenda = pdata.isRevenda;
      else if (typeof pdata.es_revenda === 'boolean') isRevenda = pdata.es_revenda;
      else if (typeof pdata.tipoProducto === 'string')
        isRevenda = pdata.tipoProducto.toLowerCase().includes('revend');
      else if (typeof p?.type === 'string')
        isRevenda = p.type.toLowerCase().includes('revend');

      let status: string;
      if (faltante <= 0) status = 'EM_ESTOQUE';
      else status = isRevenda ? 'FALTA_COMPRAR' : 'FALTA_PRODUCIR';

      return {
        ...it,
        estoqueDisponivel: disponivel,
        faltante,
        status: it.linkedProductionOrderId || it.linkedPurchaseOrderId ? it.status : status,
        sourceType: it.sourceType ?? (faltante <= 0 ? 'estoque' : isRevenda ? 'comprar' : 'producir'),
      };
    });

    return this.updateItem(id, { itens: updatedItens }, companyId);
  }

  // ─────────────────────── conversion: production ─────────────────────────
  async convertItemToProductionOrder(
    id: string,
    itemId: string,
    payload: any,
    companyId: string,
  ) {
    const order = await this.findById(id, companyId);
    if (!order) throw new NotFoundException('Orden de Pedido não encontrada');

    const itens: Item[] = Array.isArray(order.itens) ? order.itens : [];
    const item = itens.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item não encontrado');
    if (!item.productId)
      throw new BadRequestException('Item sem productId — não pode gerar OP');

    const qty = Number(payload?.quantity ?? item.faltante ?? item.quantidade ?? 0);
    if (!qty || qty <= 0)
      throw new BadRequestException('Quantidade inválida para OP');

    const number =
      payload?.number ||
      `OP-${(order as any).numero || (order as any).numeroPedido || order.id.slice(0, 6)}-${itemId.slice(0, 4)}`;

    const op = await this.productionOrders.createItem(
      {
        number,
        product_id: item.productId,
        quantity: qty,
        status: 'pending',
        sourceCustomerOrderId: order.id,
        sourceCustomerOrderItemId: itemId,
        ...payload,
      },
      companyId,
    );

    const updatedItens = itens.map((i) =>
      i.id === itemId
        ? {
            ...i,
            sourceType: 'producir' as const,
            linkedProductionOrderId: op.id,
            status: 'OP_GERADA',
          }
        : i,
    );
    return this.updateItem(id, { itens: updatedItens }, companyId);
  }

  // ─────────────────────── conversion: purchase ───────────────────────────
  async convertItemToPurchaseOrder(
    id: string,
    itemId: string,
    payload: any,
    companyId: string,
  ) {
    const order = await this.findById(id, companyId);
    if (!order) throw new NotFoundException('Orden de Pedido não encontrada');

    const itens: Item[] = Array.isArray(order.itens) ? order.itens : [];
    const item = itens.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Item não encontrado');

    const qty = Number(payload?.quantidade ?? item.faltante ?? item.quantidade ?? 0);
    if (!qty || qty <= 0)
      throw new BadRequestException('Quantidade inválida para OC');

    const oc = await this.purchaseOrders.createItem(
      {
        numeroOrdem: payload?.numeroOrdem || null,
        proveedorId: payload?.proveedorId || null,
        prazoEntrega: payload?.prazoEntrega || null,
        formaPagamento: payload?.formaPagamento || null,
        observacoes:
          payload?.observacoes ||
          `Gerada de Orden de Pedido ${order.id} (item ${itemId})`,
        estado: 'PENDIENTE',
        fechaOrden: new Date().toISOString(),
        produtos: [
          {
            productId: item.productId,
            sku: item.sku,
            descricao: item.descricao,
            quantidade: qty,
            valorUnitario: item.valorUnitario,
          },
        ],
        sourceCustomerOrderId: order.id,
        sourceCustomerOrderItemId: itemId,
        ...payload,
      },
      companyId,
    );

    const updatedItens = itens.map((i) =>
      i.id === itemId
        ? {
            ...i,
            sourceType: 'comprar' as const,
            linkedPurchaseOrderId: oc.id,
            status: 'OC_GERADA',
          }
        : i,
    );
    return this.updateItem(id, { itens: updatedItens }, companyId);
  }

  // ─────────────────────── approve for packing ────────────────────────────
  async approveForPacking(id: string, companyId: string, payload: any = {}) {
    const order = await this.findById(id, companyId);
    if (!order) throw new NotFoundException('Orden de Pedido não encontrada');

    const itens: Item[] = Array.isArray(order.itens) ? order.itens : [];
    const pendentes = itens.filter(
      (i) =>
        !(
          i.status === 'EM_ESTOQUE' ||
          i.status === 'OP_GERADA' ||
          i.status === 'OC_GERADA' ||
          i.status === 'PRONTO'
        ),
    );
    if (pendentes.length > 0 && !payload?.force) {
      throw new BadRequestException(
        `Existem ${pendentes.length} itens sem destino definido (estoque/OP/OC). Use force=true para aprovar mesmo assim.`,
      );
    }

    return this.updateItem(
      id,
      {
        status: STATUS_APROVADO_EMBALAGEM,
        approvedForPackingAt: new Date().toISOString(),
        approvedForPackingBy: payload?.approvedBy || null,
      },
      companyId,
    );
  }
}
