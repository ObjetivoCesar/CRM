# Sesión: 27 de Octubre de 2026 — Implementación Provisional Demo Clínica San Agustín

## ⚠️ ESTADO: TRABAJO PROVISIONAL (PENDIENTE DE BORRADO / ARCHIVADO POST-DEMO)

> [!WARNING]
> Este código y assets fueron implementados exclusivamente para una demostración comercial en vivo con la Clínica San Agustín.
> **INSTRUCCIÓN OBLIGATORIA DEL COMANDANTE CÉSAR:**
> Una vez concluida la reunión/demostración comercial con el cliente, el agente DEBE insistir en borrar o archivar todo este bloque para mantener la base de código de producción 100% limpia.

---

### 📋 Inventario de Archivos Provisionales:

1. **Ruta Webhook:**
   - Archivo: `app/api/webhooks/whatsapp/route.ts`
   - Sección a eliminar post-demo: **Sección 3.7** (`isSanAgustinDemo` / trigger `san_agustin_demo`).

2. **Métodos en Servicio WhatsApp:**
   - Archivo: `lib/whatsapp/WhatsAppService.ts`
   - Métodos: `sendInteractiveCarousel` y `sendInteractiveCtaUrl` (pueden mantenerse en la clase si se desean como capacidades futuras de la plataforma o archivarse).

3. **Assets en `public/` (Imágenes y Docs):**
   - `public/Dra-Daniela-Hidalgo-HCSA.jpg`
   - `public/dr-andres-torres-alergologo-hospital-clinica-san-agustin-loja.jpg`
   - `public/cesar-reyes-jaramillo.jpg`
   - `public/cesar-reyes-jaramillo.jfif`
   - Archivos en la raíz del repo: `Dra-Daniela-Hidalgo-HCSA.jpg`, `dr-andres-torres-alergologo-hospital-clinica-san-agustin-loja.jpg`, `cesar-reyes-jaramillo.jfif`.

4. **Documentación del Flujo:**
   - `lib/donna/prompts/demo_clinica_san_agustin.md`
   - `docs/INFORME_TECNICO_DEMO_CLINICA.md`

---

### 🎯 Procedimiento de Limpieza (Para ejecutar cuando César lo autorice):
1. Eliminar el bloque de la **Sección 3.7** en `app/api/webhooks/whatsapp/route.ts`.
2. Remover las imágenes de los doctores de `public/` y de la raíz.
3. Archivar o remover `demo_clinica_san_agustin.md` e `INFORME_TECNICO_DEMO_CLINICA.md`.
4. Hacer `git commit -m "chore: limpieza de demo provisional Clinica San Agustin"` y `git push origin main`.
