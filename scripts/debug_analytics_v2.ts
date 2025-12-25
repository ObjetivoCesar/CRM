
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Manual env load
try {
    const envPath = path.resolve(process.cwd(), '.env.local')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const lines = envContent.split(/\r?\n/);
    lines.forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        }
    });
} catch (e) {
    console.warn("Could not load .env.local manually", e);
}

async function debugAnalyticsParams() {
    console.log('🔍 Debugging Analytics Parameters...');

    // Simulate the Payload sent by the widget
    const mockPayload = {
        dateRange: {
            from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
            to: new Date().toISOString()
        },
        viewMode: "overview",
        filters: {}
    };

    console.log('📦 Mock Payload:', JSON.stringify(mockPayload, null, 2));

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Replicate the date filtering logic from route.ts
    const fromDate = mockPayload.dateRange.from;
    const toDate = mockPayload.dateRange.to;

    console.log(`📅 Query Range: ${fromDate} to ${toDate}`);

    let query = supabase
        .from('transactions')
        .select(`
            id, type, amount, date, status, category, contact_id,
            contacts ( business_name )
        `)
        .gte('date', fromDate)
        .lte('date', toDate);

    const { data, error } = await query;

    if (error) {
        console.error('❌ Supabase Error:', error);
    } else {
        console.log(`✅ Success! Fetched ${data?.length} transactions.`);
        if (data && data.length > 0) {
            console.log('First record sample:', data[0]);
        }
    }
}

debugAnalyticsParams();
