
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: ENV variables not found')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugTransaction() {
    console.log('🚀 Attempting to insert test transaction...')

    const testTx = {
        type: 'INCOME',
        category: 'Test Category',
        description: 'Test Transaction Debug',
        amount: 100,
        date: new Date().toISOString(),
        status: 'PENDING',
        sub_type: 'BUSINESS_VARIABLE',
        payment_method: 'Transferencia',
        client_id: null, // Testing explicit null
        lead_id: null
    }

    // First try with nulls
    console.log('1. Inserting with NULL client_id...')
    const { data, error } = await supabase.from('transactions').insert([testTx]).select()

    if (error) {
        console.error('❌ Error 1:', error)
    } else {
        console.log('✅ Success 1:', data)
        // Cleanup
        if (data && data[0]?.id) {
            await supabase.from('transactions').delete().eq('id', data[0].id)
        }
    }

    // Try with empty string (should fail if not handled, but we are testing DB behavior)
    // console.log('2. Inserting with EMPTY STRING client_id (expecting fail)...')
    // const { error: error2 } = await supabase.from('transactions').insert([{...testTx, client_id: ""}]).select()
    // console.log('Result 2:', error2?.message || 'Success??')

}

debugTransaction()
