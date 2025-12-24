'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function getProducts() {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .not('Nombre del Producto o Servicio', 'is', null)
            .neq('Nombre del Producto o Servicio', '')
            .order('Nombre del Producto o Servicio', { ascending: true })

        if (error) {
            console.error("Supabase error fetching products:", error)
            return { success: false, error: "Error al cargar los productos" }
        }

        return { success: true, data: data || [] }
    } catch (error) {
        console.error("Error fetching products:", error)
        return { success: false, error: "Error al cargar los productos" }
    }
}
