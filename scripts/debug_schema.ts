
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function checkColumns() {
    // There isn't a direct way to list columns via JS client without a stored procedure,
    // but we can try to select * limit 1 and look at keys
    const { data, error } = await supabase.from('transactions').select('*').limit(1)
    if (error) {
        console.error('Error selecting:', error)
    } else {
        if (data && data.length > 0) {
            console.log('Columns found:', Object.keys(data[0]))
        } else {
            console.log('Table is empty, attempting insert to infer columns or checking specific known columns...')
            // Try inserting dummy data with ALL potential columns to see which one fails?
            // Safer: Just assume keys if empty.
        }
    }
}
checkColumns()
