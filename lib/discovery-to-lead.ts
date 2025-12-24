import { db } from '@/lib/db';
import { discoveryLeads, contacts, interactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Converts a Discovery Lead to a regular Lead (Unified Contact)
 * Maps Discovery fields to Contact fields intelligently
 */
export async function createLeadFromDiscovery(discoveryLead: any) {
    try {
        // Map Discovery → Contact (entityType: 'lead')
        const leadData = {
            entityType: 'lead' as const,
            discoveryLeadId: discoveryLead.id, // ✅ HERENCIA DE IDENTIDAD
            businessName: discoveryLead.nombreComercial,
            contactName: discoveryLead.personaContacto || discoveryLead.representanteLegal || 'Por confirmar',
            phone: discoveryLead.telefonoPrincipal,
            email: discoveryLead.correoElectronico,
            city: discoveryLead.canton ? `${discoveryLead.canton}, ${discoveryLead.provincia}` : discoveryLead.provincia,
            address: discoveryLead.direccion,
            businessType: discoveryLead.actividadModalidad || discoveryLead.clasificacion,

            // Additional context
            businessActivity: discoveryLead.actividadModalidad,
            relationshipType: discoveryLead.categoria, // e.g., "3 Estrellas"

            // Metadata
            notes: `Convertido desde Discovery.\nRUC: ${discoveryLead.ruc || 'N/A'}\nCategoría: ${discoveryLead.categoria || 'N/A'}\nDirección: ${discoveryLead.direccion || 'N/A'}`,
            source: 'discovery',

            // Set initial status
            status: 'sin_contacto',
            phase: 1,
            convertedToLeadAt: new Date(),
        };

        // 1. Create the lead in unified contacts table
        const [newContact] = await db.insert(contacts).values(leadData).returning();

        // 2. UNIFICACIÓN DE MEMORIA: Traspasar interacciones previas al nuevo contacto
        await db.update(interactions)
            .set({ contactId: newContact.id })
            .where(eq(interactions.discoveryLeadId, discoveryLead.id));

        // 3. Update Discovery lead to mark as converted
        await db
            .update(discoveryLeads)
            .set({
                status: 'converted',
                columna1: 'contesto_interesado', // Assume interested if converted
                columna2: 'convertir_a_lead'
            })
            .where(eq(discoveryLeads.id, discoveryLead.id));

        console.log(`✅ Discovery Lead "${discoveryLead.nombreComercial}" unificado satisfactoriamente. ID Contacto: ${newContact.id}`);

        return newContact;
    } catch (error) {
        console.error('Error converting Discovery to Lead:', error);
        throw error;
    }
}
