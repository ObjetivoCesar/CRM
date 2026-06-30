import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vcard/cesar
 * Serves the full César Reyes VCF with correct MIME type so Meta Cloud API
 * can fetch and deliver it as a native WhatsApp document.
 */
export async function GET() {
    try {
        const vcfPath = path.join(process.cwd(), 'public', 'cesar-reyes-jaramillo.vcf');
        const vcfContent = fs.readFileSync(vcfPath, 'utf-8');

        return new NextResponse(vcfContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/vcard; charset=utf-8',
                'Content-Disposition': 'attachment; filename="Cesar_Reyes.vcf"',
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (err: any) {
        console.error('❌ [VCard Route] Error serving VCF:', err.message);
        return NextResponse.json({ error: 'VCF not found' }, { status: 404 });
    }
}
