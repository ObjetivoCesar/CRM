import { db, schema } from '@/lib/db';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

interface CSVLead {
    business_name: string;
    contact_name: string;
    phone?: string;
    email?: string;
    city?: string;
    business_type?: string;
}

export async function importLeadsFromCSV(filePath: string) {
    const csvContent = fs.readFileSync(filePath, 'utf-8');

    const results = Papa.parse<CSVLead>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.toLowerCase().trim().replace(/ /g, '_'),
    });

    const leads = results.data.map((row) => ({
        businessName: row.business_name,
        contactName: row.contact_name,
        phone: row.phone || null,
        email: row.email || null,
        city: row.city || null,
        businessType: row.business_type || null,
        source: 'import',
        outreachStatus: 'new',
        whatsappStatus: 'pending',
        isNewsletterSubscriber: false,
        files: [],
        audioTranscriptions: [],
        selectedServices: [],
    }));

    // Insert in batches of 100
    const batchSize = 100;
    let imported = 0;

    for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        // @ts-ignore - Drizzle types might be strict about optional fields, but SQLite handles them
        await db.insert(schema.leads).values(batch);
        imported += batch.length;
        console.log(`Imported ${imported}/${leads.length} leads`);
    }

    return { total: leads.length, imported };
}

// CLI usage
if (require.main === module) {
    const csvPath = process.argv[2];

    if (!csvPath) {
        console.error('Usage: tsx scripts/import-leads.ts <path-to-csv>');
        process.exit(1);
    }

    importLeadsFromCSV(csvPath)
        .then((result) => {
            console.log(`✅ Successfully imported ${result.imported} leads`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error importing leads:', error);
            process.exit(1);
        });
}
