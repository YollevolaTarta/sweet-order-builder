# Actualizar inicio y flujo del configurador

## Cambios
- Eliminar el modo de consumo y su filtrado de formatos.
- Convertir el paso inicial en una introducción con el título “Crea tu postre único” y un botón rosa “Empezar”.
- Ocultar en esa introducción el progreso, el contador de pasos y la barra inferior, conservando el logo.
- Mostrar siempre los tres formatos y ajustar la numeración a 5 pasos para tarta abierta y 4 para lata o shake.
- Mantener “Atrás” desde formato y “Nuevo pedido” como retornos a la introducción.
- Dejar de enviar `tipo_consumo` y enviar `store_id` con el valor `Bilbao_CascoViejo`.
- Añadir `store_id` al tipo de pedido, sin cambiar la pantalla `/kds`.

## Verificación
- Comprobar el recorrido de tarta abierta y el recorrido abreviado de lata/shake.
- Confirmar que la introducción no muestra controles del pedido y que la aplicación compila correctamente.
