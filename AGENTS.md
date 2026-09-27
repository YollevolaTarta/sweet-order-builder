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

- NUNCA modificar la base compartida (tablas, vistas, RPC, triggers, permisos/RLS, relaciones, migraciones) directamente: describir el cambio en chat para el Database Coordinator. — Existe un coordinador que revisa todo cambio sobre la base compartida.
- Las líneas de pedido solo se insertan al crear el pedido; el configurador no modifica pedidos existentes. — Permisos cerrados deliberadamente.
- Relaciones y cálculos internos van por ID (crema_id, topping_1_id, topping_2_id); los nombres son solo histórico visible. — Contrato actual de la base.
- yllt-database es el repositorio histórico oficial de la base; no recrear ni revertir comportamiento anterior.
