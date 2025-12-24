import { db, schema } from '@/lib/db';
import { NextResponse } from 'next/server';

// WhatsApp App Lead format (from your existing app)
interface WhatsAppLead {
    id: string;
    nombreComercial: string;
    actividad: string;
    clasificacion: string;
    categoria: string;
    razonSocial: string;
    provincia: string;
    canton: string;
    parroquia: string;
    telefonoPrincipal: string;
    telefonoSecundario: string;
    email: string;
    web: string;
    personaContacto: string;
    emailContacto: string;
    estado: string;
    status: 'pending' | 'initial_sent' | 'responded' | 'not_interested' | 'converted' | 'contacted' | 'no_whatsapp';
    emailSynced?: boolean;
    lastInteractionNote?: string;
}

export async function GET() {
    try {
        // Get all prospects with status 'new' or 'contacted' (ready for outreach)
        const prospects = await db.select().from(schema.prospects);

        // Map CRM prospects to WhatsApp app format
        const whatsappLeads: WhatsAppLead[] = prospects.map((prospect, index) => {
            // Parse notes JSON to get original CSV data if available
            let originalData: any = {};
            try {
                if (prospect.notes) {
                    originalData = JSON.parse(prospect.notes);
                }
            } catch (e) {
                // Notes might not be JSON, that's okay
            }

            // Map outreach status to WhatsApp app status
            let status: WhatsAppLead['status'] = 'pending';
            if (prospect.outreachStatus === 'contacted') {
                status = 'initial_sent';
            } else if (prospect.outreachStatus === 'responded') {
                status = 'responded';
            } else if (prospect.outreachStatus === 'not_interested') {
                status = 'not_interested';
            } else if (prospect.outreachStatus === 'converted_to_lead') {
                status = 'converted';
            }

            return {
                id: `lead-${index + 1}`,
                nombreComercial: prospect.businessName,
                actividad: originalData.actividad_modalidad || 'ALOJAMIENTO',
                clasificacion: prospect.businessType || originalData.clasificacion || 'HOTEL',
                categoria: originalData.categoria || '',
                razonSocial: originalData.razon_social || prospect.contactName,
                provincia: prospect.province || originalData.provincia || 'LOJA',
                canton: prospect.city || originalData.canton || '',
                parroquia: originalData.parroquia || '',
                telefonoPrincipal: prospect.phone || '',
                telefonoSecundario: originalData.telefono_secundario || '',
                email: prospect.email || originalData.correo_negocio || '',
                web: originalData.direccion_web || '',
                personaContacto: prospect.contactName,
                emailContacto: prospect.email || originalData.correo_contacto || '',
                estado: originalData.estado_notas || ' ',
                status: status,
                emailSynced: false,
                lastInteractionNote: ''
            };
        });

        // Return as JSON file download
        const filename = `turismo_crm_export_${new Date().toISOString().split('T')[0]}.json`;

        return new NextResponse(JSON.stringify(whatsappLeads, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Error exporting to WhatsApp format:', error);
        return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
    }
}
