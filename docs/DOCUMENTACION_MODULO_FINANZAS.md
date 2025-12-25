# 📊 Documentación: Módulo de Finanzas CRM Objetivo

Este documento explica la lógica, arquitectura y funcionalidades del módulo de finanzas, diseñado para equilibrar la gestión personal del propietario con la rentabilidad operativa de la empresa.

## 1. Arquitectura de Separación Estricta

Para garantizar que el negocio sea rentable y que tu vida personal esté bajo control, el sistema utiliza dos contenedores de datos totalmente aislados:

### A. Gestión de Negocio (`transactions`)
- **Solo dinero líquido**: Aquí solo entra lo que puedes gastar en la empresa.
- **Canjes (Barter)**: Se registran como `Ingreso` pero con el método de pago `CANJE`. El sistema los cuenta para el ROI del cliente, pero los **excluye** de tu saldo en banco para que no creas que tienes efectivo que en realidad son "ternos" o "servicios".

### B. Gestión Personal (`personal_liabilities`) - Soporte TDAH
- **Ubicación**: Tabla dedicada a deudas de casa, bancos y servicios básicos.
- **Funcionalidad**: Permite rastrear el **Capital Total** de una deuda (Ej: $42,000 de la casa) de forma independiente al flujo de caja mensual.
- **Control Visual**: Diseñado para que veas tus pendientes personales sin que el ruido de la empresa te abrume, y viceversa.

---

## 2. Lógica del Punto de Equilibrio (Break-even)
...

Para que el negocio sea saludable, el CRM calcula automáticamente el nivel de ventas necesario usando la siguiente fórmula:

$$Punto\,de\,Equilibrio = \frac{Costos\,Fijos}{1 - (\frac{Costos\,Variables}{Ventas\,Totales})}$$

- **Lectura**: Si tu punto de equilibrio es $3,500 y has vendido $4,000, estás en zona de **utilidad**.
- **Visualización**: El dashboard mostrará una barra de progreso que se llena conforme se registran los "Anticipos" y "Saldos" del mes.

---

## 3. Flujo de Trabajo para Nuevas Ventas

Al ingresar una nueva venta, el usuario no debe crear múltiples transacciones manualmente. La ventana de **Venta Pro** permite:
1. Definir el monto total del proyecto.
2. Ingresar el abono inicial (se registra como flujo de caja real).
3. Programar recordatorios para los saldos pendientes.
4. Vincular automáticamente al cliente para generar su historial financiero (ROI del cliente).

---

## 4. Gestión de Deudas (Liabilities)
El módulo incluye una vista de balance de deudas donde se puede ver:
- Cuánto se debe en total a cada entidad bancaria.
- En qué mes se terminará de pagar según la cuota actual.
- Alerta roja si el total de "Pasivos Personales" supera el 50% de los ingresos de la empresa.
