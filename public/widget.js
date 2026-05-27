/**
 * CRM OBJETIVO — WhatsApp Click-to-Chat Widget
 * =============================================
 *
 * Botón flotante de WhatsApp para cualquier página web.
 * Al hacer clic, abre WhatsApp con un mensaje pre-escrito.
 * El bot de ActivaQR recibe el mensaje automáticamente.
 *
 * INSTRUCCIONES PARA EL PROGRAMADOR:
 *
 * 1. Subir este archivo a: https://tudominio.com/widget.js
 * 2. En la página del cliente, pegar:
 *
 *   <script src="https://tudominio.com/widget.js"
 *           data-phone="593963410409"
 *           data-message="Hola%2C%20quiero%20informaci%C3%B3n"
 *           data-position="right"
 *           data-color="#25D366"
 *           data-brand="CRM OBJETIVO"></script>
 *
 * PARÁMETROS:
 *   data-phone    (obligatorio) — Número de WhatsApp Business
 *   data-message  (opcional)   — Mensaje pre-escrito (codificado URL)
 *   data-position (opcional)   — left | right
 *   data-color    (opcional)   — Color del botón (ej: #25D366)
 *   data-brand    (opcional)   — Nombre del negocio
 */

(function() {
  'use strict';

  var S = document.currentScript;
  var PHONE    = S.getAttribute('data-phone') || '';
  var MSG      = S.getAttribute('data-message') || 'Hola%2C%20quiero%20informaci%C3%B3n';
  var POSITION = S.getAttribute('data-position') || 'right';
  var COLOR    = S.getAttribute('data-color') || '#25D366';
  var BRAND    = S.getAttribute('data-brand') || 'Soporte';

  if (!PHONE) { console.error('[CRM Widget] Falta data-phone'); return; }

  // Estilos
  var style = document.createElement('style');
  style.textContent =
    '@keyframes crm-pulse{0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,0.4)}50%{box-shadow:0 0 0 15px rgba(37,211,102,0)}}' +
    '@keyframes crm-fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}' +
    '.crm-btn{position:fixed;bottom:20px;' + POSITION + ':20px;z-index:999999;' +
    'width:60px;height:60px;border-radius:50%;background:' + COLOR + ';color:white;' +
    'border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:transform 0.2s;animation:crm-pulse 2s infinite;}' +
    '.crm-btn:hover{transform:scale(1.1)}' +
    '.crm-btn svg{width:28px;height:28px;fill:white}' +
    '.crm-tip{position:fixed;bottom:90px;' + POSITION + ':20px;z-index:999998;' +
    'background:#1a2236;color:white;padding:10px 16px;border-radius:12px;' +
    'font-size:13px;max-width:240px;box-shadow:0 4px 12px rgba(0,0,0,0.15);' +
    'animation:crm-fadeIn 0.3s ease-out;cursor:pointer;transition:opacity 0.5s;}' +
    '.crm-tip::after{content:\"\";position:absolute;bottom:-6px;' +
    (POSITION === 'right' ? 'right' : 'left') + ':24px;' +
    'width:12px;height:12px;background:#1a2236;transform:rotate(45deg)}';
  document.head.appendChild(style);

  // HTML
  var waUrl = 'https://wa.me/' + PHONE + '?text=' + MSG;
  var div = document.createElement('div');
  div.innerHTML =
    '<div class="crm-tip" id="crm-tip">' + BRAND + ' — Chatea con nosotros 😊</div>' +
    '<button class="crm-btn" id="crm-btn" title="Chatear por WhatsApp">' +
    '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></button>';
  document.body.appendChild(div);

  document.getElementById('crm-btn').onclick = function() { window.open(waUrl, '_blank'); removeTip(); };
  var tip = document.getElementById('crm-tip');
  if (tip) tip.onclick = function() { window.open(waUrl, '_blank'); };
  function removeTip() { var t = document.getElementById('crm-tip'); if (t) t.remove(); }
  setTimeout(removeTip, 8000);
})();
