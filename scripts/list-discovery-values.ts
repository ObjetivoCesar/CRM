import { db } from '../lib/db';
import { discoveryLeads } from '../lib/db/schema';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function listDistinct() {
    console.log('🔍 Obteniendo valores únicos de Provincias...');
    const provinces = await db.selectDistinct({ name: discoveryLeads.provincia }).from(discoveryLeads).orderBy(discoveryLeads.provincia);
    console.log('📌 Provincias encontradas:', provinces.map(p => p.name).filter(Boolean));

    console.log('\n🔍 Obteniendo valores únicos de Categorías...');
    const categories = await db.selectDistinct({ name: discoveryLeads.categoria }).from(discoveryLeads).limit(20);
    console.log('📌 Categorías encontradas:', categories.map(c => c.name).filter(Boolean));

    console.log('\n🔍 Obteniendo valores únicos de Clasificaciones...');
    const classifications = await db.selectDistinct({ name: discoveryLeads.clasificacion }).from(discoveryLeads).limit(20);
    console.log('📌 Clasificaciones encontradas:', classifications.map(c => c.name).filter(Boolean));
}

listDistinct().catch(console.error);
