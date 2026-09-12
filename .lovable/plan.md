# Actualizar selección de toppings

## Cambios
- Sustituir el catálogo actual por los nombres definitivos, agrupados en Mermeladas, Cremas de frutos secos y Mousses.
- Mostrar cada categoría con cabecera propia y una fila horizontal deslizable de tarjetas con placeholder de color, nombre y precio.
- Mantener el desplazamiento vertical entre categorías y asegurar que el contenido queda visible por encima de la barra inferior.
- Conservar un máximo global de dos selecciones, marcando las elegidas y desactivando las restantes al alcanzar el límite.
- Para Cake Shake, exigir exactamente dos toppings y ocultar todos los precios tanto en las tarjetas como en el resumen de selección.
- Mantener el envío de los nombres elegidos en `topping_1` y `topping_2`.

## Verificación
- Comprobar en móvil que las tres categorías se recorren verticalmente y cada carrusel horizontalmente.
- Probar selección, deselección y bloqueo al llegar a dos opciones.
- Probar que Cake Shake no muestra precios y no permite continuar sin dos selecciones.
