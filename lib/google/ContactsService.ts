import { google } from 'googleapis';

export class GoogleContactsService {
    private people;

    constructor() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken) {
            throw new Error('Missing Google OAuth2 credentials: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN');
        }

        const auth = new google.auth.OAuth2(clientId, clientSecret);
        auth.setCredentials({ refresh_token: refreshToken });

        this.people = google.people({ version: 'v1', auth });
    }

    /**
     * Creates a new contact in César's Google Contacts.
     * Called automatically when someone scans the QR code.
     * @param phone Full phone number (e.g. "593983237491")
     * @param displayName Optional name to display (defaults to "Lead QR [last4]")
     */
    async createContact(phone: string, displayName?: string): Promise<string | null> {
        const cleanPhone = phone.replace(/\D/g, '');
        const label = displayName || `Lead QR ${cleanPhone.slice(-4)}`;

        try {
            // 1. Verificar si el contacto ya existe buscando por número de teléfono
            const searchRes = await this.people.people.searchContacts({
                query: cleanPhone,
                readMask: 'names,phoneNumbers',
            });

            if (searchRes.data.results && searchRes.data.results.length > 0) {
                const existingResourceName = searchRes.data.results[0].person?.resourceName;
                console.log(`ℹ️ [GoogleContacts] El contacto ya existe (${existingResourceName}). Se omite la creación de duplicados.`);
                return existingResourceName || null;
            }

            // 2. Si no existe, lo creamos
            const res = await this.people.people.createContact({
                requestBody: {
                    names: [{
                        givenName: label,
                        displayName: label,
                    }],
                    phoneNumbers: [{
                        value: `+${cleanPhone}`,
                        type: 'mobile',
                    }],
                    biographies: [{
                        value: `Contacto capturado automáticamente por ActivaQR el ${new Date().toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
                        contentType: 'TEXT_PLAIN',
                    }],
                },
            });

            const resourceName = res.data.resourceName;
            console.log(`✅ [GoogleContacts] Contact created: ${label} → ${resourceName}`);
            return resourceName || null;
        } catch (err: any) {
            // Specific error for insufficient scope (token doesn't have contacts permission)
            if (err.message?.includes('insufficient') || err.code === 403) {
                console.error('❌ [GoogleContacts] Token lacks CONTACTS scope. Re-authorize at /api/google/auth');
            } else {
                console.error('❌ [GoogleContacts] Failed to create contact:', err.message);
            }
            return null;
        }
    }
}

// Singleton — initialized only when env vars are present
let _instance: GoogleContactsService | null = null;

export function getGoogleContactsService(): GoogleContactsService | null {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) {
        console.warn('⚠️ [GoogleContacts] Env vars not configured. Skipping contact sync.');
        return null;
    }
    if (!_instance) {
        _instance = new GoogleContactsService();
    }
    return _instance;
}
