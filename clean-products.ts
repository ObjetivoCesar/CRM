
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanProducts() {
    console.log('Cleaning empty products...')

    // Delete rows where name is null or empty string
    const { count, error } = await supabase
        .from('products')
        .delete({ count: 'exact' })
        .or('"Nombre del Producto o Servicio".is.null,"Nombre del Producto o Servicio".eq.""')

    if (error) {
        console.error('Error cleaning products:', error)
        return
    }

    console.log(`Deleted ${count} empty rows`)

    // Get final count
    const { count: finalCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

    console.log(`Final product count: ${finalCount}`)
}

cleanProducts()
