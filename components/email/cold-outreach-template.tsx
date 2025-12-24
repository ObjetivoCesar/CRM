
import * as React from 'react';

interface ColdOutreachProps {
    businessName: string;
    contactName: string;
    videoUrl?: string; // Optional video URL
}

export const ColdOutreachTemplate: React.FC<ColdOutreachProps> = ({
    businessName,
    contactName,
    videoUrl = "https://youtube.com/shorts/s9fogp9aRtI?si=MSmFAKpbz6JKud1t" // Default video from existing code
}) => (
    <div style={{ fontFamily: 'sans-serif', lineHeight: '1.6', color: '#333' }}>
        <h2>Hola, {contactName} de {businessName}.</h2>

        <p>
            Le iba a llamar, pero con esto de la inseguridad es probable que desconfíe,
            así que mejor le escribo por aquí.
        </p>

        <p>
            Soy <strong>César Reyes</strong> y ayudo a negocios turísticos de alojamiento como
            <strong>{businessName}</strong> a:
        </p>

        <ul>
            <li>Captar clientes directos sin pagar comisiones a terceros.</li>
            <li>Que encuentren su marca en Google (no solo en redes sociales).</li>
        </ul>

        <p>
            Esto se logra <strong>POSICIONANDO TU MARCA</strong>.
        </p>

        <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '5px', borderLeft: '4px solid #0070f3' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>
                👇 Mira este video de 41 segundos donde te explico cómo saber si realmente estás posicionado:
            </p>
            <p style={{ marginTop: '10px' }}>
                <a href={videoUrl} style={{ color: '#0070f3', textDecoration: 'underline' }}>
                    Ver Video Explicativo
                </a>
            </p>
        </div>

        <p>
            Si tiene sentido para <strong>{businessName}</strong>, me gustaría agendar una breve llamada.
        </p>

        <p>¿Qué le parece?</p>

        <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #eaeaea' }} />

        <p style={{ fontSize: '12px', color: '#888' }}>
            César Reyes - Objetivo Marketing<br />
            <a href="https://cesarreyesjaramillo.com" style={{ color: '#888' }}>www.cesarreyesjaramillo.com</a>
        </p>
    </div>
);
