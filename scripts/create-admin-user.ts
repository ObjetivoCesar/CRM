import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no encontradas en .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function createAdminUser() {
    const email = 'objetivo.cesar@gmail.com'
    const password = 'Ces@rObjetivo2025'

    console.log(`🚀 Intentando crear usuario: ${email}...`)

    const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true // Confirmar automáticamente
    })

    if (error) {
        if (error.message.includes('already registered')) {
            console.log('ℹ️ El usuario ya existe. Intentando actualizar contraseña por si acaso...')

            // Si ya existe, lo buscamos para actualizar la contraseña
            const { data: listUser } = await supabase.auth.admin.listUsers()
            const user = listUser.users.find(u => u.email === email)

            if (user) {
                const { error: updateError } = await supabase.auth.admin.updateUserById(
                    user.id,
                    { password: password }
                )
                if (updateError) {
                    console.error('❌ Error actualizando contraseña:', updateError.message)
                } else {
                    console.log('✅ Contraseña actualizada correctamente.')
                }
            }
        } else {
            console.error('❌ Error creando usuario:', error.message)
        }
    } else {
        console.log('✅ Usuario creado y confirmado con éxito!')
    }
}

createAdminUser()
