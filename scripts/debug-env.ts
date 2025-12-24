import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

console.log('--- Env Keys Found ---')
Object.keys(process.env).forEach(key => {
    if (key.includes('SUPABASE')) {
        console.log(key)
    }
})
console.log('----------------------')
