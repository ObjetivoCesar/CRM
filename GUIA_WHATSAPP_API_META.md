# Guía de Integración: WhatsApp API + ActivaQR

> **Proyecto**: CRM V2 — Misma API de WhatsApp para ActivaQR  
> **Fecha**: 2026-07-10  
> **Resumen**: Cómo usar la API de WhatsApp de Meta (CRM V2) para enviar vCards desde ActivaQR

---

## 1. Configuración en Meta for Developers

### 1.1 Requisitos Previos
1. Tener una cuenta de **WhatsApp Business** (WABA)
2. Crear una **App** en [Meta for Developers](https://developers.facebook.com/)
3. Agregar el producto **WhatsApp** a la App

### 1.2 Obtener Credenciales

Desde el panel de Meta → WhatsApp → Configuración → API de WhatsApp:

| Variable | Descripción | Dónde encontrarla |
|----------|-------------|-------------------|
| `ACCESS_TOKEN` | Token permanente del sistema | Meta for Developers → tu App → WhatsApp → API de WhatsApp → Token permanente |
| `PHONE_NUMBER_ID` | ID del número de teléfono | Misma sección, debajo del token |
| `WABA_ID` | ID de la cuenta Business | WhatsApp Manager → Configuración → Información de la cuenta |

### 1.3 Suscripción de Webhooks (Crítico)

Even if webhooks verify (HTTP 200), **Meta won't send real messages** if the app isn't explicitly subscribed to the WhatsApp Business Account.

**Via Graph API Explorer:**
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your **Meta App**
3. Generate an **Access Token** with `whatsapp_business_management` permissions
4. Identify your **WABA ID** in the [WhatsApp Manager](https://business.facebook.com/wa/manage/home/)
5. In the Explorer URL bar: `WABA_ID/subscribed_apps`
6. Change method from `GET` to **`POST`**
7. Click Submit → You should receive `{"success": true}`

---

## 2. Variables de Entorno

```env
# Meta WhatsApp Cloud API
META_WA_ACCESS_TOKEN=EAAfXJZBBSPk...    # Token permanente
META_WA_PHONE_NUMBER_ID=639433412590000 # ID del número (no el número telefónico)
META_WA_VERIFY_TOKEN=my_secure_token_123 # Token para verificar webhooks
```

---

## 3. Arquitectura de la Integración

### Cómo funciona

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│  ActivaQR   │────────▶│   Base de Datos  │◀────────│   CRM V2    │
│  (escribe)  │         │  (vcards_activa) │         │  (lee/envía)│
└─────────────┘         └──────────────────┘         └─────────────┘
      1. Vende               2. Llega "#ACTIVA-VCF"        3. Envía
```

**Flujo:**
1. Cliente escanea QR → envía `#ACTIVA-VCF` por WhatsApp
2. CRM V2 recibe el mensaje (webhook)
3. CRM V2 busca el slug en la tabla `vcards_activaqr`
4. CRM V2 envía: texto + video (si existe) + vCard
5. Cliente recibe todo en WhatsApp

---

## 4. Tabla: vcards_activaqr

### 4.1 Schema (crear en la DB compartida)

```sql
CREATE TABLE vcards_activaqr (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,          -- "#ACTIVA-VCF" (único por venta)
  nombre VARCHAR(100) NOT NULL,               -- "Cesar Reyes"
  telefono VARCHAR(20),                       -- "+593999999999"
  email VARCHAR(100),
  empresa VARCHAR(100),
  vcard_url VARCHAR(500) NOT NULL,           -- URL pública del .vcf
  video_url VARCHAR(500),                     -- URL del video (opcional)
  texto TEXT,                                 -- Mensaje personalizado
  activo BOOLEAN DEFAULT true,               -- false = pausado/no disponible
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ejemplo de registro inicial
INSERT INTO vcards_activaqr (slug, nombre, telefono, vcard_url, video_url, texto)
VALUES (
  '#ACTIVA-VCF',
  'Cesar Reyes',
  '+593999999999',
  'https://tu-dominio.com/vcards/cesar.vcf',
  'https://tu-dominio.com/videos/intro.mp4',
  '¡Gracias por escribirnos! Aquí tienes mi contacto 👇'
);
```

### 4.2 Formato del slug

- Usar `#` al inicio (ej: `#CESAR-VCF`, `#MIEMPRESA-VCF`)
- Solo letras, números y guiones
- Único por venta/cliente
- Sensible a mayúsculas → CRM convierte a mayúsculas automáticamente

---

## 5. Lo que hace ActivaQR (Backend)

### 5.1 Al vender una vCard nueva

```sql
-- Insertar nuevo registro
INSERT INTO vcards_activaqr (slug, nombre, telefono, email, empresa, vcard_url, video_url, texto)
VALUES (
  '#MIEMPRESA-VCF',           -- slug único generado
  'Juan Pérez',              -- nombre del cliente
  '+593981234567',           -- teléfono
  'juan@empresa.com',        -- email
  'Empresa XYZ',             -- empresa
  'https://activaqr.com/vcards/abc123.vcf',   -- URL del vcard
  'https://activaqr.com/videos/xyz.mp4',      -- URL del video
  '¡Hola Juan! Aquí tienes mi contacto.'       -- texto personalizado
);
```

### 5.2 Al actualizar datos

```sql
-- Actualizar si el slug ya existe
UPDATE vcards_activaqr 
SET nombre = 'Juan Perez Actualizado',
    telefono = '+593987654321',
    video_url = 'https://nuevo-video.com/video.mp4',
    updated_at = NOW()
WHERE slug = '#MIEMPRESA-VCF';
```

---

## 6. EL PROBLEMA DEL VCF (CRÍTICO) — Resuelto

### 6.1 El Problema Original

Meta necesita el archivo `.vcf` con `Content-Type: text/vcard` para reconocerlo como contacto. **Sin esto, Meta ignora el archivo silenciosamente.**

### 6.2 Configurar headers según tu hosting

**Vercel** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/vcards/(.*).vcf",
      "headers": [
        { "key": "Content-Type", "value": "text/vcard; charset=utf-8" },
        { "key": "Content-Disposition", "value": "attachment; filename=\"$1.vcf\"" },
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

**Next.js** (`next.config.mjs`):
```javascript
async headers() {
  return [
    {
      source: '/vcards/:file*.vcf',
      headers: [
        { key: 'Content-Type', value: 'text/vcard; charset=utf-8' },
        { key: 'Content-Disposition', value: 'attachment; filename=":file"' },
        { key: 'Access-Control-Allow-Origin', value: '*' },
      ],
    },
  ];
}
```

**Apache** (`.htaccess`):
```apache
<FilesMatch "\.vcf$">
  Header set Content-Type "text/vcard; charset=utf-8"
  Header set Content-Disposition "attachment; filename=\"%{REQUEST_FILENAME}e\""
</FilesMatch>
```

**Nginx**:
```nginx
location ~* \.vcf$ {
  add_header Content-Type text/vcard;
  add_header Content-Disposition "attachment; filename=$name.vcf";
}
```

---

## 7. Lo que hace CRM V2 (Automático)

### Flujo de ejecución

1. Recibe mensaje con `#ACTIVA-VCF`
2. Detecta el slug en el mensaje
3. Busca en la tabla `vcards_activaqr`
4. Envía texto personalizado
5. Envía video (si existe) como `video`
6. Envía vCard como `document` con `mime_type: text/vcard`
7. Registra el contacto en el CRM

### Reintentos

Si Meta falla al enviar el vCard, CRM tiene fallback a Evolution API con Base64 (ya está implementado).

---

## 8. Mismo Número — Múltiples Proyectos

### Cómo funciona

Ambos proyectos (CRM V2 y ActivaQR) usan las **mismas credenciales** de Meta. Los mensajes se envían desde el mismo número de WhatsApp Business.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   CRM V2 ────────→ META API ─────────────────→ 📱 Cliente       │
│                                                                 │
│   ActivaQR ─────→ META API ─────────────────↗                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Configuración en ActivaQR

Copia estas variables exactas desde `.env.local` de CRM V2:

```env
META_WA_ACCESS_TOKEN=EAAfXJZBBSPk...      # Token permanente (mismo)
META_WA_PHONE_NUMBER_ID=639433412590000   # ID del número (mismo)
```

### Consideraciones Importantes

| Aspecto | Detalle |
|---------|---------|
| **Envío** | ✅ Ambos proyectos pueden enviar sin conflicto |
| **Recepción** | ⚠️ Solo CRM V2 recibe (webhook configurado ahí) |
| **Rate Limit** | Se comparte entre ambos proyectos (~80-100 msg/seg) |
| **Origen del archivo VCF** | ActivaQR hospeda su propia URL con headers correctos |

---

## 9. Resumen de Responsabilidades

| ActivaQR (Backend) | CRM V2 (Automático) |
|--------------------|---------------------|
| Crear tabla `vcards_activaqr` | Detectar slug `#ACTIVA-VCF` |
| Insertar/actualizar registro al vender | Buscar slug en DB |
| Hostear `.vcf` con `Content-Type: text/vcard` | Enviar texto + video + vCard |
| Hostear video | Registrar contacto en CRM |
| Proporcionar URL pública del vCard | Respetar Opt-Out |

---

## 10. Código Fuente de Referencia

- **[WhatsAppService.ts](lib/whatsapp/WhatsAppService.ts)** — Servicio principal con Opt-Out, logging a BD, manejo de errores
- **[WhatsAppAdapter.ts](lib/messaging/adapters/WhatsAppAdapter.ts)** — Adapter para el sistema de mensajería unificado
- **[GUIA_CONEXION.md](lib/whatsapp/GUIA_CONEXION.md)** — Guía de conexión específica para el CRM V2
- **[activaqr_qr_vcard.md](lib/donna/prompts/activaqr_qr_vcard.md)** — Flujo actual de vCard en CRM V2

---

*Documento generado el 2026-07-10*
