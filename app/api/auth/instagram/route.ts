import { NextRequest, NextResponse } from 'next/server';

/**
 * Inicio del flujo OAuth de Instagram (Meta Graph API)
 * Visita: /api/auth/instagram para comenzar la autorización
 */
export async function GET(req: NextRequest) {
    const appId = process.env.INSTAGRAM_APP_ID;
    const origin = new URL(req.url).origin;
    const redirectUri = `${origin}/api/auth/instagram/callback`;

    if (!appId) {
        return new NextResponse(`
            <html>
                <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0b0e11; color: #e9edef;">
                    <div style="background: #111b21; padding: 2.5rem; border-radius: 16px; border: 1px solid #202c33; text-align: center; max-width: 500px;">
                        <div style="font-size: 50px; margin-bottom: 10px;">⚠️</div>
                        <h2 style="color: #ff6b6b;">Configuración Incompleta</h2>
                        <p style="color: #8696a0; font-size: 15px; line-height: 1.6;">
                            Falta la variable de entorno <code style="background:#202c33; padding:2px 6px; border-radius:4px; color:#00a884;">INSTAGRAM_APP_ID</code> en tu archivo <code style="background:#202c33; padding:2px 6px; border-radius:4px; color:#00a884;">.env.local</code>.
                        </p>
                        <div style="margin: 20px 0; padding: 15px; background: #202c33; border-radius: 12px; text-align: left;">
                            <p style="margin: 0; font-size: 13px; color: #aebac1; line-height: 1.8;">
                                <strong style="color:#e9edef;">1.</strong> Ve a <a href="https://developers.facebook.com" target="_blank" style="color:#00a884;">developers.facebook.com</a><br/>
                                <strong style="color:#e9edef;">2.</strong> Selecciona tu App → Configuración → Básica<br/>
                                <strong style="color:#e9edef;">3.</strong> Copia tu <strong>App ID</strong> y <strong>App Secret</strong><br/>
                                <strong style="color:#e9edef;">4.</strong> Agrégalos a tu <code style="color:#00a884;">.env.local</code>:<br/><br/>
                                <code style="font-size:11px; color:#53bdeb; display:block; background:#111b21; padding:10px; border-radius:8px;">
                                    INSTAGRAM_APP_ID=tu_app_id<br/>
                                    INSTAGRAM_APP_SECRET=tu_app_secret
                                </code>
                            </p>
                        </div>
                        <p style="font-size:12px; color:#667781;">Luego reinicia el servidor y vuelve a esta página.</p>
                    </div>
                </body>
            </html>
        `, { headers: { 'Content-Type': 'text/html' } });
    }

    // Permisos requeridos
    const scopes = [
        'instagram_basic',
        'instagram_manage_messages',
        'instagram_manage_comments',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement',
        'ads_management',
    ].join(',');

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;

    return NextResponse.redirect(authUrl);
}
