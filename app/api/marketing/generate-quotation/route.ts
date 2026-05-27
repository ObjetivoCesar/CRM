import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { contacts, quotations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PRODUCTS } from '@/lib/marketing/activaqr-adn';

/**
 * POST /api/marketing/generate-quotation
 * 
 * Generates an intelligent quotation for a lead based on their enriched chat data.
 * Uses the ActivaQR ADN to select the best product match.
 * 
 * Body: { contactId: string }
 * Returns: { success, quotation: { id, title, content, totalAmount } }
 */
export async function POST(request: Request) {
    try {
        const { contactId } = await request.json();
        if (!contactId) {
            return NextResponse.json({ success: false, error: 'contactId required' }, { status: 400 });
        }

        // 1. Get enriched contact data
        const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
        if (!contact) {
            return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });
        }

        // 2. Match product from ADN using the enriched data
        const interestedProduct = contact.interestedProduct?.toLowerCase() || '';
        const businessActivity = contact.businessActivity?.toLowerCase() || '';

        let matchedProduct = PRODUCTS[0]; // Default: Contacto Digital
        let bestScore = 0;

        PRODUCTS.forEach(product => {
            let score = 0;
            // Match by interested product keywords
            product.keywords.forEach(kw => {
                if (interestedProduct.includes(kw)) score += 20;
                if (businessActivity.includes(kw)) score += 10;
            });
            // Match by pains
            if (contact.pains) {
                product.pains.forEach(pain => {
                    if (contact.pains!.toLowerCase().includes(pain.substring(0, 20).toLowerCase())) score += 15;
                });
            }
            if (score > bestScore) {
                bestScore = score;
                matchedProduct = product;
            }
        });

        // 3. Build quotation
        const contactName = contact.contactName || 'Cliente';
        const businessName = contact.businessName || businessActivity || 'Tu Negocio';
        const { name, price, angle, reptileArguments } = matchedProduct;

        const quotationTitle = `${name} — Propuesta para ${businessName}`;
        const quotationContent = [
            `# Cotización: ${name}`,
            ``,
            `**Cliente:** ${contactName}`,
            `**Negocio:** ${businessName}`,
            `**Fecha:** ${new Date().toLocaleDateString('es-EC')}`,
            ``,
            `---`,
            ``,
            `## 📋 Resumen Ejecutivo`,
            ``,
            `${angle}`,
            ``,
            `## 💰 Inversión`,
            ``,
            `**${price}**`,
            ``,
            `## 🎯 ¿Por qué esto?`,
            ``,
            `${reptileArguments?.[0] || 'Solución diseñada para tu negocio.'}`,
            ``,
            `---`,
            ``,
            `*Cotización generada automáticamente por CRM OBJETIVO · Válida por 7 días*`,
        ].join('\n');

        // 4. Parse price to number
        const priceMatch = price.match(/\d+/);
        const totalAmount = priceMatch ? parseFloat(priceMatch[0]) : 0;

        // 5. Save to quotations table
        const [newQuotation] = await db.insert(quotations).values({
            title: quotationTitle,
            status: 'draft',
            selectedServices: JSON.stringify([{
                name,
                price,
                description: angle,
            }]),
            totalAmount,
            createdBy: 'system_auto',
            leadId: contactId,
        }).returning();

        console.log(`📄 Quotation generated for ${contactId}: ${quotationTitle}`);

        // 6. Update contact status to cotizado
        await db.update(contacts)
            .set({
                quotation: quotationContent,
                status: 'cotizado',
                updatedAt: new Date(),
            } as any)
            .where(eq(contacts.id, contactId));

        return NextResponse.json({
            success: true,
            quotation: {
                id: newQuotation.id,
                title: quotationTitle,
                content: quotationContent,
                totalAmount,
                price,
                productName: name,
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }
        });

    } catch (error: any) {
        console.error('❌ Generate Quotation Error:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
