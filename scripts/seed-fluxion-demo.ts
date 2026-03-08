import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const COMPANY_ID = '21d1e41a-778a-4fe9-8903-91016f663263';
const DEMO_PREFIX = 'demo-fluxion-2026-';
const START_DAYS_AGO = 60;

const productCatalog = [
  { name: 'Disco de Corte 4.1/2"', price: 14.9 },
  { name: 'Disco de Desbaste 7"', price: 21.5 },
  { name: 'Lixa Flap Grão 60', price: 12.2 },
  { name: 'Lixa Flap Grão 80', price: 12.2 },
  { name: 'Rebolo Reto 6"', price: 33.8 },
  { name: 'Rebolo Copo 4"', price: 38.0 },
  { name: 'Pasta Abrasiva Fina', price: 45.0 },
  { name: 'Pasta Abrasiva Média', price: 44.0 },
  { name: 'Escova de Aco Circular', price: 27.9 },
  { name: 'Fita Abrasiva 50x2000', price: 55.0 },
  { name: 'Pedra de Afiacao', price: 31.7 },
  { name: 'Kit Polimento Industrial', price: 89.9 },
];

const clientNames = [
  'Metalurgica Atlas',
  'Usinagem Ribeiro',
  'Fabrica Nova Era',
  'Aco Sul Componentes',
  'Torres Manutencao',
  'Mecanica Vale Forte',
  'Fundicao Pioneira',
  'Industrias MZ',
  'Tecno Corte SP',
  'Prime Pecas Industriais',
];

const employeeNames = [
  'Carlos Augusto',
  'Marina Lopes',
  'Joao Felipe',
  'Patricia Souza',
  'Rafael Nunes',
  'Aline Batista',
  'Ricardo Mota',
  'Fernanda Reis',
  'Bruno Carvalho',
  'Vanessa Araujo',
  'Eduardo Lima',
  'Camila Prado',
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function dayAt(base: Date, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const company = await prisma.companies.findUnique({ where: { id: COMPANY_ID } });
  if (!company) {
    throw new Error(`Company ${COMPANY_ID} not found`);
  }

  await prisma.companies.update({
    where: { id: COMPANY_ID },
    data: {
      plan: 'enterprise',
      active: true,
      updated_at: new Date(),
    },
  });

  // Cleanup only previously generated demo records.
  await prisma.sale_status_history.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.sale_items.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.sales.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.production_orders.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.financial_transactions.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.inventory_movements.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.audit_logs.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.employees.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.clients.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.products.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });

  const products = productCatalog.map((p, idx) => ({
    id: `${DEMO_PREFIX}prd-${String(idx + 1).padStart(2, '0')}`,
    company_id: COMPANY_ID,
    name: p.name,
    code: `${DEMO_PREFIX}P${String(idx + 1).padStart(3, '0')}`,
    price: p.price,
    current_stock: rand(100, 900),
    type: 'finished_good',
    data: {
      demo: true,
      demoTag: DEMO_PREFIX,
      category: 'abrasivos',
    },
    published: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 65),
    updated_at: new Date(),
  }));

  await prisma.products.createMany({ data: products });

  const clients = clientNames.map((name, idx) => ({
    id: `${DEMO_PREFIX}cli-${String(idx + 1).padStart(2, '0')}`,
    companyId: COMPANY_ID,
    nome: name,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * rand(45, 90)),
    updatedAt: new Date(),
    data: {
      demo: true,
      demoTag: DEMO_PREFIX,
      segmento: pick(['metalurgica', 'usinagem', 'manutencao']),
      cidade: pick(['Sao Paulo', 'Campinas', 'Guarulhos', 'Sorocaba']),
    },
  }));

  await prisma.clients.createMany({ data: clients });

  const employees = employeeNames.map((name, idx) => ({
    id: `${DEMO_PREFIX}emp-${String(idx + 1).padStart(2, '0')}`,
    company_id: COMPANY_ID,
    name,
    department: pick(['Producao', 'Expedicao', 'Qualidade', 'Comercial']),
    position: pick(['Operador', 'Analista', 'Supervisor', 'Assistente']),
    status: 'active',
    start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * rand(180, 720)),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * rand(60, 120)),
    updated_at: new Date(),
    data: {
      demo: true,
      demoTag: DEMO_PREFIX,
      turno: pick(['A', 'B', 'C']),
    },
  }));

  await prisma.employees.createMany({ data: employees });

  const salesRows: any[] = [];
  const saleItemsRows: any[] = [];
  const saleHistoryRows: any[] = [];
  const inventoryRows: any[] = [];
  const financeRows: any[] = [];
  const productionRows: any[] = [];
  const auditRows: any[] = [];

  const start = new Date();
  start.setDate(start.getDate() - START_DAYS_AGO);
  start.setHours(0, 0, 0, 0);

  let saleSeq = 1;
  let movementSeq = 1;
  let financeSeq = 1;
  let poSeq = 1;
  let auditSeq = 1;

  for (let day = 0; day < START_DAYS_AGO; day++) {
    const baseDate = new Date(start);
    baseDate.setDate(start.getDate() + day);

    const salesPerDay = rand(2, 5);
    for (let s = 0; s < salesPerDay; s++) {
      const saleId = `${DEMO_PREFIX}sale-${String(saleSeq++).padStart(4, '0')}`;
      const saleTime = dayAt(baseDate, rand(8, 17), rand(0, 59));

      const itemCount = rand(1, 3);
      let saleTotal = 0;
      const saleItemSnapshot: any[] = [];

      for (let i = 0; i < itemCount; i++) {
        const p = pick(products);
        const qty = rand(2, 30);
        const unitPrice = Number(p.price);
        const lineTotal = round2(qty * unitPrice);
        saleTotal += lineTotal;

        const saleItemId = `${DEMO_PREFIX}sitem-${String(saleSeq).padStart(4, '0')}-${i + 1}`;
        saleItemsRows.push({
          id: saleItemId,
          company_id: COMPANY_ID,
          sale_id: saleId,
          line_number: i + 1,
          item_type: 'product',
          product_id: p.id,
          sku: p.code,
          description: p.name,
          quantity: qty,
          unit_price: unitPrice,
          line_total: lineTotal,
          created_at: saleTime,
          updated_at: saleTime,
          metadata: { demo: true, demoTag: DEMO_PREFIX },
        });

        saleItemSnapshot.push({
          produto: p.name,
          sku: p.code,
          quantidade: qty,
          unitario: unitPrice,
          total: lineTotal,
        });

        inventoryRows.push({
          id: `${DEMO_PREFIX}mov-${String(movementSeq++).padStart(5, '0')}`,
          companyId: COMPANY_ID,
          createdAt: new Date(saleTime.getTime() + 1000 * 60),
          updatedAt: new Date(saleTime.getTime() + 1000 * 60),
          data: {
            demo: true,
            demoTag: DEMO_PREFIX,
            tipo: 'saida',
            origem: 'venda',
            saleId,
            produtoId: p.id,
            produto: p.name,
            quantidade: qty,
            dataMovimento: new Date(saleTime.getTime() + 1000 * 60).toISOString(),
          },
        });
      }

      const status = pick(['APPROVED', 'INVOICED', 'DELIVERED']);
      const client = pick(clients);

      salesRows.push({
        id: saleId,
        companyId: COMPANY_ID,
        createdAt: saleTime,
        updatedAt: saleTime,
        data: {
          demo: true,
          demoTag: DEMO_PREFIX,
          numero: `V-${String(saleSeq).padStart(5, '0')}`,
          clienteId: client.id,
          clienteNome: client.nome,
          status,
          formaPagamento: pick(['pix', 'boleto', 'transferencia', 'cartao']),
          valorTotal: round2(saleTotal),
          itens: saleItemSnapshot,
        },
      });

      saleHistoryRows.push({
        id: `${DEMO_PREFIX}sh-${String(saleSeq).padStart(5, '0')}`,
        company_id: COMPANY_ID,
        sale_id: saleId,
        from_status: 'CREATED',
        to_status: status,
        changed_by: 'sistema-demo',
        changed_at: new Date(saleTime.getTime() + 1000 * 120),
        created_at: new Date(saleTime.getTime() + 1000 * 120),
        updated_at: new Date(saleTime.getTime() + 1000 * 120),
        metadata: { demo: true, demoTag: DEMO_PREFIX },
      });

      financeRows.push({
        id: `${DEMO_PREFIX}fin-${String(financeSeq++).padStart(5, '0')}`,
        company_id: COMPANY_ID,
        type: 'income',
        amount: round2(saleTotal),
        description: `Receita venda ${saleId}`,
        date: new Date(saleTime.getTime() + 1000 * 60 * 30),
        created_at: new Date(saleTime.getTime() + 1000 * 60 * 30),
        updated_at: new Date(saleTime.getTime() + 1000 * 60 * 30),
      });

      auditRows.push({
        id: `${DEMO_PREFIX}audit-${String(auditSeq++).padStart(5, '0')}`,
        companyId: COMPANY_ID,
        user: 'demo.bot',
        module: 'sales',
        action: 'SALE_CREATED',
        timestamp: new Date(saleTime.getTime() + 1000 * 180),
        data: { demo: true, demoTag: DEMO_PREFIX, saleId },
      });
    }

    if (Math.random() > 0.25) {
      const expenseDate = dayAt(baseDate, rand(9, 18), rand(0, 59));
      financeRows.push({
        id: `${DEMO_PREFIX}fin-${String(financeSeq++).padStart(5, '0')}`,
        company_id: COMPANY_ID,
        type: 'expense',
        amount: round2(rand(120, 2200) + Math.random()),
        description: pick([
          'Compra de insumos abrasivos',
          'Frete e logistica',
          'Manutencao preventiva',
          'Despesa energia setor producao',
        ]),
        date: expenseDate,
        created_at: expenseDate,
        updated_at: expenseDate,
      });
    }

    if (day % 2 === 0) {
      const p = pick(products);
      const poDate = dayAt(baseDate, rand(7, 15), rand(0, 59));
      productionRows.push({
        id: `${DEMO_PREFIX}po-${String(poSeq).padStart(5, '0')}`,
        number: `${DEMO_PREFIX}OP-${String(poSeq).padStart(5, '0')}`,
        company_id: COMPANY_ID,
        product_id: p.id,
        quantity: rand(50, 300),
        status: pick(['pending', 'in_progress', 'completed']),
        created_at: poDate,
        updated_at: poDate,
        data: {
          demo: true,
          demoTag: DEMO_PREFIX,
          prioridade: pick(['normal', 'alta']),
          responsavel: pick(employeeNames),
        },
      });
      poSeq++;
    }

    if (day % 3 === 0) {
      const p = pick(products);
      const inDate = dayAt(baseDate, rand(6, 10), rand(0, 59));
      const qty = rand(80, 260);
      inventoryRows.push({
        id: `${DEMO_PREFIX}mov-${String(movementSeq++).padStart(5, '0')}`,
        companyId: COMPANY_ID,
        createdAt: inDate,
        updatedAt: inDate,
        data: {
          demo: true,
          demoTag: DEMO_PREFIX,
          tipo: 'entrada',
          origem: 'compra',
          produtoId: p.id,
          produto: p.name,
          quantidade: qty,
          dataMovimento: inDate.toISOString(),
        },
      });
    }
  }

  await prisma.sales.createMany({ data: salesRows });
  await prisma.sale_items.createMany({ data: saleItemsRows });
  await prisma.sale_status_history.createMany({ data: saleHistoryRows });
  await prisma.inventory_movements.createMany({ data: inventoryRows });
  await prisma.financial_transactions.createMany({ data: financeRows });
  await prisma.production_orders.createMany({ data: productionRows });
  await prisma.audit_logs.createMany({ data: auditRows });

  console.log('Demo dataset generated for Fluxion');
  console.log({
    companyId: COMPANY_ID,
    products: products.length,
    clients: clients.length,
    employees: employees.length,
    sales: salesRows.length,
    saleItems: saleItemsRows.length,
    saleHistory: saleHistoryRows.length,
    inventoryMovements: inventoryRows.length,
    financialTransactions: financeRows.length,
    productionOrders: productionRows.length,
    auditLogs: auditRows.length,
  });
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
