
'use server'

import { resend, getSenderEmail } from '@/lib/email/resend';
import { ColdOutreachTemplate } from '@/components/email/cold-outreach-template';
import { db, schema } from '@/lib/db';
import { eq, inArray } from 'drizzle-orm';

interface EmailRecipient {
    id: string; // Prospect ID
    email: string;
    contactName: string;
    businessName: string;
}

export async function sendBatchEmails(recipients: EmailRecipient[]) {
    const senderEmail = getSenderEmail();
    const results = {
        success: 0,
        failed: 0,
        errors: [] as any[]
    };

    // Resend Free Tier Limit Check (100/day). 
    // We assume the frontend limits the batch size (e.g., 50).

    // NOTE: In a real production batch, you might want to use a queue (e.g. BullMQ) 
    // or Resend's batch API if supported. For <100, a simple loop with Promise.allSettled is fine for now
    // but let's do sequential to avoid hitting rate limits too hard if any.

    for (const recipient of recipients) {
        try {
            const { data, error } = await resend.emails.send({
                from: `César Reyes <${senderEmail}>`,
                to: [recipient.email],
                subject: `Propuesta de Posicionamiento para ${recipient.businessName}`,
                react: ColdOutreachTemplate({
                    businessName: recipient.businessName,
                    contactName: recipient.contactName,
                }),
            });

            if (error) {
                console.error(`Failed to send to ${recipient.email}:`, error);
                results.failed++;
                results.errors.push({ email: recipient.email, error });
            } else {
                results.success++;

                // Update DB
                await db.update(schema.prospects)
                    .set({
                        lastEmailSentAt: new Date(),
                        emailSequenceStep: 1, // Advance to step 1
                        outreachStatus: 'contacted'
                    })
                    .where(eq(schema.prospects.id, recipient.id));
            }

        } catch (e) {
            console.error(`Exception sending to ${recipient.email}:`, e);
            results.failed++;
            results.errors.push({ email: recipient.email, error: e });
        }
    }

    return results;
}

export async function sendQuotationEmail(formData: FormData) {
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const htmlBody = formData.get('body') as string;
    const attachmentBase64 = formData.get('attachment') as string;
    const filename = formData.get('filename') as string;

    console.log('📧 Email Debug:', {
        to,
        subject,
        filename,
        hasAttachment: !!attachmentBase64,
        attachmentLength: attachmentBase64?.length
    });

    const senderEmail = getSenderEmail();

    try {
        const emailOptions: any = {
            from: `Objetivo <${senderEmail}>`,
            to: [to],
            subject: subject,
            html: htmlBody.replace(/\n/g, '<br>'),
        };

        if (attachmentBase64 && filename) {
            // Resend expects attachments in this specific format
            emailOptions.attachments = [{
                filename: filename,
                content: attachmentBase64, // Send base64 string directly, not Buffer
            }];
            console.log('📎 Attachment added:', filename);
        } else {
            console.warn('⚠️ No attachment data received');
        }

        console.log('📤 Sending email via Resend...');
        const { data, error } = await resend.emails.send(emailOptions);

        if (error) {
            console.error('❌ Resend error:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ Email sent successfully:', data);
        return { success: true, data };
    } catch (error) {
        console.error('💥 Server action error:', error);
        return { success: false, error: 'Failed to send email' };
    }
}
