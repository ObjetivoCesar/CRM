# Configuración SMTP para Email Marketing

## Credenciales
- **Email**: turismo@cesarreyesjaramillo.com
- **Servidor**: mail.cesarreyesjaramillo.com
- **Puerto SMTP (SSL)**: 465
- **Puerto SMTP (No SSL)**: 26
- **Autenticación**: Requerida

## Variables de Entorno (.env.local)
```env
# Email Configuration
SMTP_HOST=mail.cesarreyesjaramillo.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=turismo@cesarreyesjaramillo.com
SMTP_PASSWORD=<TU_CONTRASEÑA_AQUI>
SMTP_FROM_NAME=César Reyes - Posicionamiento Real
SMTP_FROM_EMAIL=turismo@cesarreyesjaramillo.com
```

## Próximos Pasos
1. Agregar las variables de entorno al archivo `.env.local`
2. Instalar `nodemailer` para envío de emails
3. Crear API route `/api/email/send` para enviar emails
4. Crear secuencia de 5 emails automáticos
