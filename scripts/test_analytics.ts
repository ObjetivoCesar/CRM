
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
        process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '')
    }
})

async function testAnalyticsAPI() {
    console.log('🧪 Testing Analytics Logic (Simulation)...');

    // We can't call the Next.js API route directly from CLI easily without spinning up a fetch to localhost
    // But we can simulate the LOGIC by running a similar query here to verify the aggregation works.

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`id, type, amount, date, status, category, contact_id`)
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    if (error) {
        console.error('❌ Supabase Query Failed:', error);
        return;
    }

    console.log(`✅ Fetched ${transactions.length} transactions for this month.`);

    let income = 0;
    let expense = 0;
    let pending = 0;

    transactions.forEach(t => {
        if (t.type === 'INCOME') {
            if (t.status === 'PAID') income += t.amount;
            else pending += t.amount;
        } else if (t.type === 'EXPENSE' && t.status === 'PAID') {
            expense += t.amount;
        }
    });

    console.log('--- Quick Stats Simulation ---');
    console.log(`Income (Paid): ${income}`);
    console.log(`Expense (Paid): ${expense}`);
    console.log(`Collection Pending: ${pending}`);
    console.log(`Net Profit: ${income - expense}`);

    if (income === 0 && expense === 0 && transactions.length > 0) {
        console.warn('⚠️ Transactions found but stats are 0. Check logic (maybe statuses are not PAID).');
    } else {
        console.log('✅ Analytics Logic seems sane.');
    }
}

testAnalyticsAPI();
