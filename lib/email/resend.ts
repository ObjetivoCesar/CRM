
// Removed 'resend' package dependency due to installation conflicts.
// Using native Fetch API to call Resend directly.

const RESEND_API_URL = 'https://api.resend.com/emails';
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not defined in .env.local');
}

// Client wrapper mimicking the Resend SDK structure for compatibility
export const resend = {
    emails: {
        send: async (payload: any) => {
            try {
                const response = await fetch(RESEND_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: payload.from,
                        to: payload.to,
                        subject: payload.subject,
                        html: payload.react ? undefined : payload.html, // Support raw HTML directly
                        attachments: payload.attachments || undefined, // ← CRITICAL FIX: Support PDF attachments
                        // Note: React components need to be rendered to HTML string before passing here
                        // because we removed the SDK that handles that automatically.
                        // We will handle this in the calling function.
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    return { data: null, error: errorData };
                }

                const data = await response.json();
                return { data, error: null };
            } catch (error) {
                return { data: null, error };
            }
        }
    }
};

export const getSenderEmail = () => {
    // Return the email used for signup for now
    return 'onboarding@resend.dev';
};
