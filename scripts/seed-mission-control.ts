import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for seeding

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedMissionControl() {
    console.log('🚀 Seeding Mission Control scenarios...');

    // 1. Create a dummy client
    const clientId = uuidv4();
    const { error: clientError } = await supabase.from('clients').insert([{
        id: clientId,
        business_name: 'Opticare Notaria Test',
        contact_name: 'Dra. Elena Martínez',
        email: 'elena@notaria.com',
        phone: '0991234567'
    }]);

    if (clientError) console.error('Error seeding client:', clientError);

    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 5);

    // 2. Scenario: "The Tight Month"
    // Transactions: 1 Paid (Low), 1 Pending (Critical for debt)
    const transactions = [
        {
            type: 'INCOME',
            category: 'Venta - Anticipo',
            description: 'Anticipo Proyecto Automatización',
            amount: 50.00,
            date: now.toISOString(),
            status: 'PAID',
            payment_method: 'Transferencia',
            sub_type: 'BUSINESS_VARIABLE',
            client_id: clientId
        },
        {
            type: 'INCOME',
            category: 'Venta - Saldo',
            description: 'Saldo Pendiente Notaria (CRÍTICO)',
            amount: 800.00,
            date: now.toISOString(),
            due_date: nextWeek.toISOString(),
            status: 'PENDING',
            sub_type: 'BUSINESS_VARIABLE',
            client_id: clientId
        }
    ];

    const { error: txError } = await supabase.from('transactions').insert(transactions);
    if (txError) console.error('Error seeding transactions:', txError);

    // 3. Personal Liabilities: "The Big Debt"
    // Cuota Casa: $900 due soon
    const liabilities = [
        {
            name: 'Banco de Loja - Hipoteca',
            category: 'Vivienda',
            monthly_payment: 950.00,
            total_debt: 45000,
            remaining_debt: 38000,
            due_date: nextWeek.getDate(), // Due the same day as the collection!
            status: 'UP_TO_DATE'
        }
    ];

    const { error: liabError } = await supabase.from('personal_liabilities').insert(liabilities);
    if (liabError) console.error('Error seeding liabilities:', liabError);

    console.log('✅ Mission Control seed complete. Open /finance to see the alerts!');
}

seedMissionControl();
