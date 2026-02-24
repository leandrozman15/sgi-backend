import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

type DashboardPeriod = 'today' | 'week' | 'month' | 'year';

@Injectable()
export class AnalysisService {
  private prisma: PrismaService;

  constructor(prisma: PrismaService) {
    this.prisma = prisma;
  }

  private toNumber(value: any): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private asObject(value: any): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
    return {};
  }

  private getPeriodDates(period: DashboardPeriod) {
    const now = new Date();
    const currentStart = new Date(now);
    const currentEnd = new Date(now);

    if (period === 'today') {
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      currentStart.setDate(now.getDate() - diff);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);
    } else if (period === 'year') {
      currentStart.setMonth(0, 1);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);
    } else {
      currentStart.setDate(1);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);
    }

    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(currentStart);

    if (period === 'today') {
      previousStart.setDate(previousStart.getDate() - 1);
      previousStart.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      previousStart.setDate(previousStart.getDate() - 7);
    } else if (period === 'year') {
      previousStart.setFullYear(previousStart.getFullYear() - 1);
    } else {
      previousStart.setMonth(previousStart.getMonth() - 1);
    }

    return { currentStart, currentEnd, previousStart, previousEnd, now };
  }

  private salesTotal(rows: any[]) {
    return rows.reduce((acc, row) => {
      const data = this.asObject(row?.data);
      const total =
        data?.valorTotal ??
        data?.totalValue ??
        data?.total ??
        data?.valorTotalVenda ??
        0;
      return acc + this.toNumber(total);
    }, 0);
  }

  private purchaseTotal(rows: any[]) {
    return rows.reduce((acc, row) => {
      const data = this.asObject(row?.data);
      const fromData =
        data?.valorTotal ??
        data?.totalValue ??
        data?.total ??
        data?.valorTotalCompra ??
        0;

      if (this.toNumber(fromData) > 0) {
        return acc + this.toNumber(fromData);
      }

      const items = Array.isArray((row as any)?.produtos)
        ? row.produtos
        : Array.isArray(data?.produtos)
        ? data.produtos
        : [];

      const itemsTotal = items.reduce((itemAcc: number, item: any) => {
        const quantity = this.toNumber(item?.quantity ?? item?.quantidade ?? 0);
        const unitPrice = this.toNumber(item?.unitPrice ?? item?.valorUnitario ?? item?.price ?? 0);
        return itemAcc + quantity * unitPrice;
      }, 0);

      return acc + itemsTotal;
    }, 0);
  }

  private trend(current: number, previous: number) {
    if (!previous && !current) return 0;
    if (!previous) return 100;
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  async getDashboardGerencial(companyId: string, periodInput: string) {
    if (!companyId) {
      return {
        kpiData: {
          vendasHoje: 0,
          comprasHoje: 0,
          clientesAtivos: 0,
          funcionarios: 0,
          vendasTrend: 0,
          comprasTrend: 0,
          clientesNovos: 0,
          funcionariosAusentes: 0,
        },
        salesVsPurchasesData: [],
        salesBySellerData: [],
        topProductsData: [],
        topClientsData: [],
        alertsData: [],
        recentActivityData: [],
      };
    }

    const normalizedPeriod = (['today', 'week', 'month', 'year'].includes(periodInput)
      ? periodInput
      : 'month') as DashboardPeriod;

    const { currentStart, currentEnd, previousStart, previousEnd, now } = this.getPeriodDates(normalizedPeriod);

    const [
      salesCurrent,
      salesPrevious,
      purchasesCurrent,
      purchasesPrevious,
      clientsActive,
      clientsNew,
      employeesTotal,
      attendanceToday,
      salesLast6Months,
      saleItems,
      products,
      auditLogs,
      payables,
    ] = await Promise.all([
      this.prisma.sales.findMany({
        where: { companyId, createdAt: { gte: currentStart, lte: currentEnd } },
      }),
      this.prisma.sales.findMany({
        where: { companyId, createdAt: { gte: previousStart, lte: previousEnd } },
      }),
      this.prisma.purchase_orders.findMany({
        where: { company_id: companyId, created_at: { gte: currentStart, lte: currentEnd } },
      }),
      this.prisma.purchase_orders.findMany({
        where: { company_id: companyId, created_at: { gte: previousStart, lte: previousEnd } },
      }),
      this.prisma.clients.count({ where: { companyId, deletedAt: null } }),
      this.prisma.clients.count({ where: { companyId, createdAt: { gte: currentStart, lte: currentEnd }, deletedAt: null } }),
      this.prisma.employees.count({ where: { company_id: companyId } }),
      this.prisma.hr_attendance_records.findMany({
        where: { company_id: companyId, date: { gte: new Date(now.setHours(0, 0, 0, 0)) } },
      }),
      this.prisma.sales.findMany({
        where: {
          companyId,
          createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.sale_items.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' },
        take: 500,
      }),
      this.prisma.products.findMany({
        where: { company_id: companyId },
        select: { id: true, name: true, current_stock: true },
      }),
      this.prisma.audit_logs.findMany({
        where: { companyId },
        orderBy: { timestamp: 'desc' },
        take: 10,
      }),
      this.prisma.$queryRaw<Array<{ due_date: Date | null }>>`
        SELECT due_date
        FROM accounting_accounts_payable
        WHERE company_id = ${companyId} AND COALESCE(status, 'OPEN') = 'OPEN'
        ORDER BY created_at DESC
        LIMIT 50
      `,
    ]);

    const vendasHoje = this.salesTotal(salesCurrent);
    const vendasPrevias = this.salesTotal(salesPrevious);
    const comprasHoje = this.purchaseTotal(purchasesCurrent);
    const comprasPrevias = this.purchaseTotal(purchasesPrevious);

    const funcionariosAusentes = attendanceToday.filter((item) => {
      const status = String(item?.status || '').toLowerCase();
      return status.includes('falt') || status.includes('aus') || status.includes('absent');
    }).length;

    const salesBySellerMap = new Map<string, number>();
    const topClientsMap = new Map<string, { compras: number; ultima: Date | null }>();

    for (const sale of salesCurrent) {
      const data = this.asObject(sale?.data);
      const seller = String(data?.vendedorNome ?? data?.sellerName ?? 'Sem vendedor');
      const client = String(data?.clienteNome ?? data?.customerName ?? 'Sem cliente');
      const amount = this.toNumber(data?.valorTotal ?? data?.totalValue ?? data?.total ?? 0);

      salesBySellerMap.set(seller, (salesBySellerMap.get(seller) || 0) + amount);

      const clientInfo = topClientsMap.get(client) || { compras: 0, ultima: null };
      clientInfo.compras += amount;
      clientInfo.ultima = !clientInfo.ultima || sale.createdAt > clientInfo.ultima ? sale.createdAt : clientInfo.ultima;
      topClientsMap.set(client, clientInfo);
    }

    const salesBySellerData = Array.from(salesBySellerMap.entries())
      .map(([name, total]) => ({ name, Vendas: Number(total.toFixed(2)) }))
      .sort((a, b) => b.Vendas - a.Vendas)
      .slice(0, 10);

    const topClientsData = Array.from(topClientsMap.entries())
      .map(([name, info]) => ({
        name,
        compras: Number(info.compras.toFixed(2)),
        ultima: info.ultima ? info.ultima.toISOString().slice(0, 10) : '-',
      }))
      .sort((a, b) => b.compras - a.compras)
      .slice(0, 10);

    const productStockMap = new Map<string, number>();
    for (const product of products) {
      productStockMap.set(product.name, Number(product.current_stock ?? 0));
    }

    const topProductsMap = new Map<string, number>();
    for (const item of saleItems) {
      const key = item.description || 'Produto sem descrição';
      topProductsMap.set(key, (topProductsMap.get(key) || 0) + this.toNumber(item.quantity));
    }

    const topProductsData = Array.from(topProductsMap.entries())
      .map(([name, vendido]) => {
        const stock = productStockMap.get(name) ?? 0;
        return {
          name,
          vendido: Number(vendido.toFixed(2)),
          stock,
          status: stock > 10 ? 'ok' : 'low',
        };
      })
      .sort((a, b) => b.vendido - a.vendido)
      .slice(0, 10);

    const last6MonthsMap = new Map<string, { Vendas: number; Compras: number }>();
    const monthLabel = (date: Date) =>
      `${date.toLocaleString('pt-BR', { month: 'short' })}/${String(date.getFullYear()).slice(-2)}`;

    const purchasesLast6Months = await this.prisma.purchase_orders.findMany({
      where: {
        company_id: companyId,
        created_at: { gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) },
      },
      orderBy: { created_at: 'asc' },
    });

    for (const sale of salesLast6Months) {
      const key = monthLabel(sale.createdAt);
      const current = last6MonthsMap.get(key) || { Vendas: 0, Compras: 0 };
      const data = this.asObject(sale?.data);
      current.Vendas += this.toNumber(data?.valorTotal ?? data?.totalValue ?? data?.total ?? 0);
      last6MonthsMap.set(key, current);
    }

    for (const purchase of purchasesLast6Months) {
      const key = monthLabel(purchase.created_at || new Date());
      const current = last6MonthsMap.get(key) || { Vendas: 0, Compras: 0 };
      current.Compras += this.purchaseTotal([purchase]);
      last6MonthsMap.set(key, current);
    }

    const salesVsPurchasesData = Array.from(last6MonthsMap.entries())
      .map(([name, values]) => ({ name, Vendas: Number(values.Vendas.toFixed(2)), Compras: Number(values.Compras.toFixed(2)) }))
      .slice(-6);

    const alertsData: Array<{ type: string; text: string }> = [];

    const lowStockProducts = topProductsData.filter((item) => item.status !== 'ok').slice(0, 3);
    for (const item of lowStockProducts) {
      alertsData.push({
        type: 'warning',
        text: `Estoque baixo para ${item.name} (saldo: ${item.stock}).`,
      });
    }

    const overduePayables = payables.filter((item) => item.due_date && item.due_date < new Date()).length;
    if (overduePayables > 0) {
      alertsData.push({
        type: 'warning',
        text: `${overduePayables} título(s) em contas a pagar estão vencidos.`,
      });
    }

    const recentActivityData = auditLogs.map((log) => ({
      time: log.timestamp.toISOString().slice(11, 16),
      description: `${log.module}: ${log.action}`,
    }));

    return {
      kpiData: {
        vendasHoje: Number(vendasHoje.toFixed(2)),
        comprasHoje: Number(comprasHoje.toFixed(2)),
        clientesAtivos: clientsActive,
        funcionarios: employeesTotal,
        vendasTrend: this.trend(vendasHoje, vendasPrevias),
        comprasTrend: this.trend(comprasHoje, comprasPrevias),
        clientesNovos: clientsNew,
        funcionariosAusentes,
      },
      salesVsPurchasesData,
      salesBySellerData,
      topProductsData,
      topClientsData,
      alertsData,
      recentActivityData,
    };
  }

  async getInventoryControl(companyId: string) {
    if (!companyId) {
      return { products: [], rawMaterials: [] };
    }

    const [products, rawMaterials] = await Promise.all([
      this.prisma.products.findMany({
        where: { company_id: companyId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.raw_materials.findMany({
        where: { companyId, deletedAt: null },
        orderBy: { nome: 'asc' },
      }),
    ]);

    return {
      products,
      rawMaterials,
    };
  }

  async getStockMovements(companyId: string, limit = 200) {
    if (!companyId) {
      return [];
    }

    const movements = await this.prisma.inventory_movements.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(limit || 200, 1000)),
    });

    return movements.map((movement) => {
      const data = this.asObject(movement?.data);
      return {
        ...movement,
        itemName: data?.itemName ?? data?.item_name ?? 'Sem item',
        itemType: data?.itemType ?? data?.item_type ?? '-',
        type: data?.type ?? '-',
        quantity: this.toNumber(data?.quantity),
        reason: data?.reason ?? '-',
        userName: data?.userName ?? data?.user_name ?? '-',
      };
    });
  }

  async getRawMaterialConsumption(companyId: string, limit = 500) {
    if (!companyId) {
      return [];
    }

    const [orders, products] = await Promise.all([
      this.prisma.production_orders.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' },
        take: Math.max(1, Math.min(limit || 500, 2000)),
      }),
      this.prisma.products.findMany({
        where: { company_id: companyId },
        select: {
          id: true,
          name: true,
          raw_materials: true,
        },
      }),
    ]);

    const productsMap = new Map(products.map((product) => [product.id, product]));

    return orders.map((order) => {
      const product = productsMap.get(order.product_id);
      const rawMaterials = Array.isArray(product?.raw_materials) ? product?.raw_materials : [];
      const quantity = Number(order.quantity || 0);

      const consumption = rawMaterials.map((material: any) => {
        const quantityPerUnit = this.toNumber(material?.quantity ?? material?.qty ?? 0);
        return {
          rawMaterialName: String(material?.name ?? material?.nome ?? 'Material'),
          quantityPerUnit,
          requiredProducts: quantity,
          totalConsumption: Number((quantityPerUnit * quantity).toFixed(4)),
        };
      });

      return {
        order: {
          id: order.id,
          orderNumber: order.number,
          client: '-',
        },
        consumption,
      };
    });
  }

  async getEmployeeEfficiency(companyId: string) {
    if (!companyId) {
      return [];
    }

    const sales = await this.prisma.sales.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const map = new Map<string, { totalProduced: number; totalHours: number; totalScrap: number }>();

    for (const sale of sales) {
      const data = this.asObject(sale?.data);
      const seller = String(data?.vendedorNome ?? data?.sellerName ?? 'Sem vendedor');
      const soldAmount = this.toNumber(data?.valorTotal ?? data?.totalValue ?? data?.total ?? 0);
      const workedHours = 8;

      const current = map.get(seller) || { totalProduced: 0, totalHours: 0, totalScrap: 0 };
      current.totalProduced += soldAmount;
      current.totalHours += workedHours;
      map.set(seller, current);
    }

    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        totalProduced: Number(stats.totalProduced.toFixed(2)),
        totalScrap: 0,
        totalHours: stats.totalHours.toFixed(2),
        efficiency: '100.00',
        avgProductionPerHour: (stats.totalHours > 0 ? stats.totalProduced / stats.totalHours : 0).toFixed(2),
        scrapRate: '0.00',
      }))
      .sort((a, b) => b.totalProduced - a.totalProduced);
  }

  async getMachineProductivity(companyId: string) {
    if (!companyId) {
      return [];
    }

    const machines = await this.prisma.machines.findMany({
      where: { company_id: companyId },
      orderBy: { name: 'asc' },
      select: { name: true },
    });

    return machines.map((machine) => ({
      name: machine.name,
      totalProduced: 0,
      totalHours: '0.00',
      avgProductionPerHour: '0.00',
    }));
  }

  async getScrapRegister(companyId: string) {
    if (!companyId) {
      return [];
    }

    return [];
  }
}
