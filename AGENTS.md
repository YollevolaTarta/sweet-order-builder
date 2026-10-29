<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Base de datos YLLT

Antes de realizar cambios estructurales o funcionales relevantes, consulta `yllt-database/docs/constitucion_tecnica.md`. Sus reglas tienen prioridad sobre decisiones técnicas locales. Después consulta el estado actual del sistema (`yllt-database/docs/estado_sistema_y_riesgos.md`) y los contratos compartidos correspondientes (`yllt-database/docs/contratos_base_compartida.md`). Si hay contradicción, manda la Constitución Técnica y, después, esos documentos.

- NUNCA modificar la base compartida (tablas, datos, vistas, RPC, triggers, permisos/RLS, Edge Functions, migraciones) directamente: describir el cambio en chat para el Database Coordinator. — Existe un coordinador que revisa todo cambio sobre la base compartida.
- El configurador no modifica pedidos existentes. — Permisos cerrados deliberadamente.
- Relaciones y cálculos internos van por ID (crema_id, topping_1_id, topping_2_id); los nombres son solo histórico visible. — Contrato actual de la base.
- yllt-database es el repositorio histórico oficial de la base; no recrear ni revertir comportamiento anterior.

## Checkout web (contrato vigente desde el 13/10/2026)

- Los pedidos web (canal `web`) se crean SOLO con la RPC `crear_pedido_web(p_datos, p_confirmar)`, desde `src/lib/checkout-web.ts`.
- `p_confirmar = false` → presupuesto (no escribe nada). `p_confirmar = true` → confirmación (el servidor crea pedido, líneas y ficha de cliente en una transacción).
- Al confirmar se envía `total_esperado` (el total del último presupuesto mostrado) y, en envío, `fecha_envio_esperada`. Si el servidor responde `precio_actualizado` o `fecha_envio_actualizada`, mostrar el nuevo dato y pedir al cliente que vuelva a pulsar «Pagar ahora». Nunca reintentar en silencio.
- Configuración pública (textos y versiones de las casillas legales, precios base, envío, `pago_web_modo`) solo por `config_web_publica()`. No escribir esos textos en el código.
- La web NUNCA hace INSERT directo en `pedidos`, `lineas_pedido` ni `pedido_clientes`, ni envía precios, totales, numeración ni estado de pago.
- `pago_web_modo = 'simulado'`: solo desarrollo; prohibido vender así. El pago real aún no está integrado y el proveedor está sin decidir.
- Cancelación online desactivada: no crear enlaces, botones ni páginas de cancelación.

## Tablet y QR

- Sin cambios hasta el bloque de pago presencial: siguen insertando el pedido (canal `tablet`/`qr`) y sus líneas solo al crearlo, con `pagado`/`prueba`. No modificarlos.
