
import { resend, getSenderEmail } from '@/lib/email/resend';
import { ColdOutreachTemplate } from '@/components/email/cold-outreach-template';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyEmail() {
    console.log('📧 Testing Resend connection...');

    // IMPORTANT: For Free/Unverified domains, you can ONLY send to the email address 
    // you used to sign up for Resend.
    const TEST_RECIPIENT = 'automatizotunegocio@gmail.com'; // Updated as per user request

    try {
        const { data, error } = await resend.emails.send({
            from: `Test <${getSenderEmail()}>`,
            to: [TEST_RECIPIENT],
            subject: 'Test de Integración CRM + Resend 🚀',
            react: ColdOutreachTemplate({
                businessName: 'Negocio de Prueba',
                contactName: 'César (Test)',
            }),
        });

        if (error) {
            console.error('❌ Error sending email:', error);
        } else {
            console.log('✅ Email sent successfully!');
            console.log('ID:', data?.id);
            console.log(`Check your inbox at ${TEST_RECIPIENT}`);
            console.log('(Note: If you used a different email for Resend signup, edit this script and change TEST_RECIPIENT)');
        }
    } catch (e) {
        console.error('❌ Exception:', e);
    }
}

verifyEmail();
