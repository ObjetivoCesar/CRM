import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { systemSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/settings/instagram
 * Body: { accessToken: string }
 * Saves the Instagram access token to system_settings and validates it.
 */
export async function POST(req: NextRequest) {
    try {
        const { accessToken } = await req.json();

        if (!accessToken || typeof accessToken !== 'string' || accessToken.length < 20) {
            return NextResponse.json({ error: 'accessToken is required and must be a valid string' }, { status: 400 });
        }

        // Validate the token against Meta before saving
        const validateRes = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${accessToken}`);
        const validateData = await validateRes.json();

        if (validateData.error) {
            return NextResponse.json({
                error: 'Token rejected by Meta API',
                meta_error: validateData.error
            }, { status: 400 });
        }

        console.log(`✅ Token validated for user: ${validateData.name || validateData.id}`);

        // Save to DB
        await db.insert(systemSettings)
            .values({ key: 'instagram_config', value: { accessToken } })
            .onConflictDoUpdate({
                target: systemSettings.key,
                set: { value: { accessToken }, updatedAt: new Date() }
            });

        return NextResponse.json({
            success: true,
            message: 'Instagram access token saved successfully',
            validated_for: validateData.name || validateData.id
        });
    } catch (error: any) {
        console.error('❌ Error saving Instagram config:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/settings/instagram
 * Returns the current Instagram config (without exposing the full token).
 */
export async function GET() {
    try {
        const [config] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'instagram_config')).limit(1);

        if (!config?.value) {
            return NextResponse.json({ configured: false, message: 'No Instagram token configured' });
        }

        const token = (config.value as any).accessToken || '';
        return NextResponse.json({
            configured: !!token,
            token_preview: token ? `${token.slice(0, 8)}...${token.slice(-4)}` : null,
            instagramUserId: (config.value as any).instagramUserId || null,
            updatedAt: config.updatedAt
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
