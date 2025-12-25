import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedFinanceData() {
    console.log('🚀 Seeding Finance Data...');

    // 1. Personal Liabilities (Deudas Casa y Bancos)
    const liabilities = [
        { name: 'Comida', category: 'Alimentación', monthly_payment: 400, status: 'UP_TO_DATE', due_date: 5 },
        { name: 'Luz, H2O, Internet', category: 'Servicios', monthly_payment: 100, status: 'UP_TO_DATE', due_date: 10 },
        { name: 'Cuota Banco de Loja', category: 'Préstamo', monthly_payment: 80, total_debt: 1600, remaining_debt: 1600, due_date: 15 },
        { name: 'Cuota Banco de Pacífico', category: 'Préstamo', monthly_payment: 250, total_debt: 9000, remaining_debt: 9000, due_date: 20 },
        { name: 'Cuota Produbanco', category: 'Préstamo', monthly_payment: 130, total_debt: 5500, remaining_debt: 5500, due_date: 25 },
        { name: 'Cuota Casa', category: 'Vivienda', monthly_payment: 900, total_debt: 42000, remaining_debt: 42000, due_date: 1 },
        { name: 'Educación y Vestimenta', category: 'Personal', monthly_payment: 200, status: 'UP_TO_DATE', due_date: 5 },
        { name: 'Cuota Martha Banco de Loja', category: 'Préstamo', monthly_payment: 250, total_debt: 10200, remaining_debt: 10200, due_date: 15 },
        { name: 'Cuota Martha Tarjeta', category: 'Préstamo', monthly_payment: 90, total_debt: 1606, remaining_debt: 1606, due_date: 10 },
    ];

    const { error: liabError } = await supabase.from('personal_liabilities').insert(liabilities);
    if (liabError) console.error('Error seeding liabilities:', liabError);
    else console.log('✅ Personal Liabilities seeded.');

    // 2. Business Fixed Costs (Costos Fijos Empresa)
    const fixedCosts = [
        { type: 'EXPENSE', sub_type: 'BUSINESS_FIXED', category: 'Sueldos', description: 'Sueldo César', amount: 2000, status: 'PAID', date: '2025-10-01' },
        { type: 'EXPENSE', sub_type: 'BUSINESS_FIXED', category: 'Sueldos', description: 'Sueldo Michael', amount: 350, status: 'PAID', date: '2025-10-01' },
        { type: 'EXPENSE', sub_type: 'BUSINESS_FIXED', category: 'Servicios', description: 'Servicios básicos oficina', amount: 100, status: 'PAID', date: '2025-10-01' },
        { type: 'EXPENSE', sub_type: 'BUSINESS_FIXED', category: 'Arriendo', description: 'Arriendo oficina', amount: 400, status: 'PAID', date: '2025-10-01' },
    ];

    const { error: fixedError } = await supabase.from('transactions').insert(fixedCosts);
    if (fixedError) console.error('Error seeding fixed costs:', fixedError);
    else console.log('✅ Business Fixed Costs seeded.');

    // 3. Sample Sales (Septiembre)
    const sales = [
        { type: 'INCOME', sub_type: 'BUSINESS_VARIABLE', category: 'Venta', description: 'Opticare - Página Web (Anticipo)', amount: 250, status: 'PAID', date: '2025-09-05' },
        { type: 'INCOME', sub_type: 'BUSINESS_VARIABLE', category: 'Venta', description: 'Opticare - Página Web (Saldo)', amount: 250, status: 'PAID', date: '2025-09-20' },
        { type: 'INCOME', sub_type: 'BUSINESS_VARIABLE', category: 'Venta', description: 'Jorge Reyes - Anticipo', amount: 130, status: 'PAID', date: '2025-09-10' },
        { type: 'INCOME', sub_type: 'BUSINESS_VARIABLE', category: 'Venta', description: 'Jorge Reyes - Saldo Pendiente', amount: 170, status: 'PENDING', due_date: '2025-10-10', date: '2025-09-10' },
        { type: 'INCOME', sub_type: 'BUSINESS_VARIABLE', category: 'Venta', description: 'Carlos Poma - Canje con ternos', amount: 250, status: 'PAID', payment_method: 'CANJE', date: '2025-09-15' },
    ];

    const { error: salesError } = await supabase.from('transactions').insert(sales);
    if (salesError) console.error('Error seeding sales:', salesError);
    else console.log('✅ Sample Sales seeded.');

    console.log('🏁 Seeding Complete!');
}

seedFinanceData();
