# Sweet Order Builder

PROMPT LOVABLE — CONFIGURADOR DE PEDIDO MVP

Yo Llevo la Tarta

CONTEXTO

"Yo Llevo la Tarta" es una tienda de postres personalizados en formato pequeño. El configurador sustituye al mostrador: el cliente construye su pedido solo, sin hablar con nadie. Funciona en una tablet fija en tienda y desde el móvil del cliente (sin descarga, acceso por link).

La experiencia tiene que sentirse como configurar un personaje en un videojuego: cada elección es visual, rápida y satisfactoria. Sin texto largo, sin menús complicados. El cliente tiene que poder completar su pedido en menos de 60 segundos.

FLUJO COMPLETO — PASO A PASO

PASO 0 — ¿CÓMO LO QUIERES?

Dos opciones únicas, visuales y grandes:

Comer ahora

Icono o ilustración de persona comiendo / disfrutando en el momento

Desbloquea: tarta abierta, tarta en lata, cake shake

Para llevar

Icono o ilustración de bolsa / para llevar

Desbloquea: tarta en lata, cake shake

Sin texto explicativo largo. Solo las dos opciones y que se entienda de un vistazo.

PASO 1 — ELIGE TU FORMATO

Muestra los formatos disponibles según lo elegido en el paso 0.

Si eligió "Comer ahora" — 3 opciones:

Formato Peso Precio base Tarta abierta 160g Desde 4,90€ Tarta en lata 160g Desde 4,90€ Cake shake 250ml 7,50€

Si eligió "Para llevar" — 2 opciones:

Formato Peso Precio base Tarta en lata 160g Desde 4,90€ Cake shake 250ml 7,50€

Cada opción como tarjeta visual grande con:

Nombre del formato

Peso o volumen

Precio base visible

Imagen o vídeo corto real del producto

El cake shake muestra claramente que incluye 2 toppings en el precio.

PASO 2 — ELIGE TU CREMA

Una por pedido, obligatoria.

Cremas disponibles:

Vainilla

Lemon curd

Coulant chocolate

NY cheesecake

Basque cheesecake

Cada crema como tarjeta con:

Nombre

Vídeo corto real (textura, color, movimiento) — placeholder de vídeo para el MVP

Descripción máximo 1 línea. Ejemplos:

Vainilla: "Suave, cremosa y aromática"

Lemon curd: "Intensa, ácida y refrescante"

Coulant chocolate: "Profunda y fundente"

NY cheesecake: "Densa, rica y equilibrada"

Basque cheesecake: "Cremosa con toque salado"

Al seleccionar una crema se marca visualmente (borde de color, check) y se puede cambiar antes de continuar.

PASO 3 — ELIGE TU TOPPING

Para tarta abierta y tarta en lata:

Mínimo 1, máximo 2

Si elige 2, el precio de ambos se suma al precio base

Puede continuar con 1 solo

Para cake shake:

Obligatorio elegir exactamente 2

El botón de continuar no se activa hasta que haya 2 elegidos

El precio ya está incluido en los 7,50€, no se suma nada

Toppings disponibles y precios:

Topping Precio Mermelada de fresa 1€ Mermelada de frambuesa 1€ Mermelada de mango 1€ Mermelada de maracuyá 1€ Crema de nuez 1€ Crema de almendra 1€ Crema de avellana 1€ Crema de pecana 1€ Crema de pistacho 2€ Ganache de café 2€ Ganache de matcha 2€ Ganache de frutas (5 sabores) 2€

Los toppings de 1€ y los de 2€ visualmente diferenciados (etiqueta de precio clara en cada tarjeta).

En cake shake: los precios no aparecen porque están incluidos. Solo se muestran los nombres.

Cada topping como tarjeta con:

Nombre

Precio (excepto en shake)

Vídeo corto real — placeholder para el MVP

Descripción máximo 1 línea

Cuando se selecciona un topping se marca visualmente. Si ya hay 2 seleccionados, el resto se desactiva (no se pueden elegir más). Se puede deseleccionar para cambiar.

PASO 4 — ¿VAS A QUERER SACAR FOTO?

Pantalla simple, una sola pregunta:

"¿Vas a querer sacar foto?" Subtexto: "Si es así, añadiremos una decoración especial"

Dos botones:

Sí, quiero foto

No, gracias

Esta elección va al KDS para que el cocinero sepa si añadir decoración visual o no. El cliente no elige qué decoración — eso lo decide el cocinero.

Este paso aparece siempre, independientemente del formato elegido.

PASO 5 — RESUMEN Y CONFIRMACIÓN

Pantalla final antes de confirmar el pedido.

Muestra:

Formato elegido + peso

Crema elegida

Topping/s elegido/s con precio individual

Decoración: sí / no

Línea de precio desglosada:

Precio base del formato

Topping 1 (si aplica)

Topping 2 (si aplica)

Total: X,XX€

Para cake shake: "Todo incluido: 7,50€"

Botón grande: CONFIRMAR PEDIDO

Al confirmar:

Se genera número de pedido

El pedido va al KDS de cocina

El cliente ve una pantalla de confirmación con su número de pedido en grande: "Tu pedido es el #07 — te avisamos cuando esté listo"

PRECIOS — RESUMEN

Formato Precio base Toppings Tarta abierta 4,90€ + 1€ o 2€ por topping, máx 2 Tarta en lata 4,90€ + 1€ o 2€ por topping, máx 2 Cake shake 7,50€ Incluidos (2 obligatorios)

El precio total se actualiza en tiempo real en la parte inferior de la pantalla mientras el cliente hace sus elecciones. Siempre visible, nunca oculto.

UX Y COMPORTAMIENTO

Progreso visible en todo momento: barra o indicador de paso (0 de 5, 1 de 5, etc.)

Botón "Atrás" en cada paso para cambiar la elección anterior

Sin scroll dentro de cada paso — todo visible en pantalla sin bajar

Si hay muchos toppings y no caben, carrusel horizontal deslizable

Animación de transición entre pasos: suave, rápida, sin demoras

El precio total siempre visible en la parte inferior como barra fija

Diseñado mobile-first: funciona en el móvil del cliente y en tablet fija de tienda

Sin login, sin registro, sin datos personales para el MVP

DATOS DE PRUEBA

Para el MVP usa estos placeholders donde irían los vídeos reales:

Imagen estática de color sólido con el nombre encima

Crema vainilla → fondo amarillo claro

Crema lemon curd → fondo amarillo intenso

Crema coulant chocolate → fondo marrón oscuro

Crema NY cheesecake → fondo blanco roto

Crema basque cheesecake → fondo beige dorado

Toppings → fondo del color representativo de cada sabor

VISUAL Y ESTILO

Fondo claro (blanco o gris muy suave) — contrasta con el fondo oscuro del KDS y obrador

Texto oscuro sobre fondo claro — es una app de cliente, tiene que ser bonita y apetecible

Rosa #F4A7B9 como color principal de interacción (botones seleccionados, bordes activos, barra de progreso)

Rojo #E8341C para el botón de confirmar pedido y precio total

Tipografía redondeada, amable, sans-serif — nada de tipografía técnica

Tarjetas con esquinas muy redondeadas y sombra suave

Animaciones suaves al seleccionar opciones (pequeño rebote o highlight)

El precio total en la barra inferior en rojo #E8341C, siempre visible

Logo "Yo Llevo la Tarta" en cabecera, pequeño pero presente

LO QUE NO ES ESTE MVP

No procesa pagos (el pago es en mostrador con TPV físico)

No tiene pedidos para recoger con hora (eso va en el desarrollo real)

No tiene login ni cuenta de cliente

No guarda historial de pedidos

No tiene vídeos reales (placeholders de color)

No se comunica con el dashboard de obrador (eso va en el desarrollo real)

El pedido generado sí tiene que llegar al KDS — esa conexión es la única imprescindible para que el MVP sea funcional de verdad.

RESUMEN: LO QUE TIENE QUE FUNCIONAR

Paso 0: elegir comer ahora o para llevar, con formatos disponibles según elección

Paso 1: elegir formato con peso y precio base visible

Paso 2: elegir crema con placeholder visual y descripción de 1 línea

Paso 3: elegir 1 o 2 toppings con precio individual visible (excepto shake que son 2 obligatorios sin precio extra)

Paso 4: pregunta de foto para decoración

Paso 5: resumen con precio desglosado y botón de confirmar

Precio total actualizado en tiempo real en barra inferior durante todo el flujo

Número de pedido generado al confirmar

Pedido enviado al KDS al confirmar

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d725d2b4-7fc7-40f7-a488-ad43d698d53a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
