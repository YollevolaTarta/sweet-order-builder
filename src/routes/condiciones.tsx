import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { LegalPage, H, Email, Tel } from "@/components/legal-page";

export const Route = createFileRoute("/condiciones")({
  head: () => ({ meta: [
    { title: "Condiciones de compra — Yo Llevo la Tarta" },
    { name: "description", content: "Condiciones de compra en yollevolatarta.com: pedidos, precios, recogida, envío, cancelaciones, garantía y campañas." },
    { property: "og:title", content: "Condiciones de compra — Yo Llevo la Tarta" },
    { property: "og:description", content: "Condiciones de compra en yollevolatarta.com: pedidos, precios, recogida, envío, cancelaciones, garantía y campañas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  useEffect(() => {
    if (window.location.hash === "#campanas") document.getElementById("campanas")?.scrollIntoView({ block: "start" });
  }, []);
  return (
    <LegalPage title="Condiciones de compra">
      <p>Estas condiciones regulan las compras en yollevolatarta.com. Al pagar un pedido las aceptas, así que léelas antes.</p>
      <H>1. Quién vende</H>
      <p>YO LLEVO LA TARTA, S.L.U., NIF B05730528, C/ Artekale 45, 48005 Bilbao (Bizkaia), inscrita en el Registro Mercantil de Bizkaia, hoja BI-88544, inscripción 1.ª. Email: <Email /> · Teléfono: <Tel />.</p>
      <H>2. Datos del comprador</H>
      <p>Necesitamos datos reales para preparar y entregar tu pedido. Podemos anular un pedido con datos falsos o que parezca fraudulento; en ese caso devolvemos lo pagado.</p>
      <H>3. Cómo se compra</H>
      <ol>
        <li>Eliges los productos.</li>
        <li>Eliges recogida en tienda o envío a domicilio, según lo que permita cada producto.</li>
        <li>Revisas el resumen: productos, alérgenos, gastos de envío y precio total con IVA. Antes de pagar puedes volver atrás y corregir el pedido o tus datos.</li>
        <li>Aceptas estas condiciones y pagas.</li>
        <li>Te enviamos un email de confirmación con el número de pedido y los datos de recogida o de envío.</li>
      </ol>
      <p>El pedido solo queda confirmado cuando se completa el pago. El contrato se hace en español. Guardamos tu pedido y la versión de las condiciones que aceptaste; si quieres una copia, pídenosla por email.</p>
      <H>4. Precios y pago</H>
      <ul>
        <li>Los precios están en euros e incluyen el IVA.</li>
        <li>Los gastos de envío se muestran antes de pagar.</li>
        <li>Si hubiera un error de precio evidente, te avisaremos. Podrás confirmar el pedido al precio correcto o cancelarlo con reembolso completo.</li>
        <li>Puedes pagar con los medios que se muestran en la pantalla de pago, antes de confirmar. El pago lo gestiona la pasarela segura de una entidad bancaria; nosotros no vemos ni guardamos los datos de tu tarjeta.</li>
        <li>Recibirás el justificante de tu compra. Si necesitas factura completa, pídela por email con tu número de pedido y tus datos fiscales.</li>
      </ul>
      <H>5. Nuestros productos</H>
      <ul>
        <li>Se elaboran a mano en nuestro obrador. Puede haber pequeñas diferencias de forma o acabado; las fotos son orientativas.</li>
        <li>Los alérgenos de cada producto se muestran antes de comprar. En nuestro obrador se manipulan alérgenos, así que no podemos garantizar la ausencia de trazas. Si tienes una alergia o intolerancia, revisa la información y escríbenos antes de comprar si tienes dudas.</li>
        <li>Conserva y consume el producto según su etiqueta y sus instrucciones.</li>
      </ul>
      <H>6. Recogida en tienda</H>
      <ul>
        <li>En C/ Artekale 45, Bilbao, el día y la franja que elijas, dentro del horario de la tienda. Basta con el número de pedido, también si viene otra persona.</li>
        <li>Si llegas tarde, te lo entregamos mientras la tienda esté abierta ese mismo día.</li>
        <li><strong>Si no lo recoges el día elegido, el pedido se pierde y no hay reembolso</strong>, porque es un producto fresco.</li>
      </ul>
      <H>7. Envío a domicilio</H>
      <ul>
        <li>Solo a España peninsular (no Baleares, Canarias, Ceuta, Melilla ni fuera de España).</li>
        <li>Llega en frío, como kit para montar en casa, con los ingredientes etiquetados y las instrucciones. El cake shake no se envía.</li>
        <li>Gastos de envío: 9 € por pedido, salvo que una campaña diga otra cosa (punto 12).</li>
        <li>Preparamos los envíos los miércoles y jueves. Los pedidos hechos hasta el miércoles a las 16:00 salen el miércoles; los hechos desde entonces hasta el jueves a las 16:00 salen el jueves. Los posteriores salen el miércoles siguiente.</li>
        <li>Enviamos con SEUR. Entrega prevista: entre 24 y 48 horas desde la salida. No hay entregas en sábado, domingo ni festivos.</li>
        <li>Indica una dirección donde haya alguien para recibirlo y un teléfono correcto. <strong>Si no se puede entregar porque no hay nadie o los datos son incorrectos, no hay reembolso ni reenvío</strong>, porque es un producto perecedero.</li>
        <li>Al recibirlo, guárdalo en la nevera enseguida.</li>
      </ul>
      <H>8. Cancelaciones</H>
      <ul>
        <li><strong>Recogida:</strong> gratis hasta 24 horas antes del inicio de tu franja.</li>
        <li><strong>Envío:</strong> gratis hasta las 16:00 del día anterior a la preparación.</li>
        <li>Para cancelar, escríbenos dentro de plazo a <Email />, desde el email de la compra y con tu número de pedido. Te devolvemos el importe íntegro, envío incluido, por el mismo medio de pago y en un máximo de 14 días.</li>
        <li>Fuera de plazo no se puede cancelar. Si al comprar el plazo ya ha pasado, te lo indicamos antes de pagar.</li>
        <li>Para cambiar un pedido, cancélalo dentro de plazo y haz uno nuevo.</li>
      </ul>
      <H>9. Sin derecho de desistimiento</H>
      <p>Por ley no hay derecho de desistimiento en productos que caducan rápido ni en productos hechos a gusto del cliente (artículo 103 de la Ley General para la Defensa de los Consumidores y Usuarios). Esto no afecta a la cancelación en plazo (punto 8) ni a tu garantía (punto 10).</p>
      <H>10. Garantía, incidencias y errores</H>
      <ul>
        <li>Tienes la garantía legal de conformidad: si el producto no es correcto, tienes derecho a que lo solucionemos.</li>
        <li>Para poder comprobarlo con un producto fresco, te pedimos que:
          <ul className="mt-1">
            <li>en recogida, revises el pedido en la tienda y nos digas allí mismo si falta algo; si hay un error que no se ve desde fuera, nos avises ese mismo día con una foto;</li>
            <li>en envío, nos avises en las 24 horas siguientes a la entrega, con fotos del producto y del embalaje.</li>
          </ul>
        </li>
        <li>Escríbenos a <Email /> con tu número de pedido. Si el problema es nuestro o del transportista, reponemos el producto o, si no es posible, te devolvemos su importe.</li>
        <li>No son defectos: que no te guste el sabor elegido, las pequeñas diferencias de un producto hecho a mano ni el deterioro por conservarlo mal después de la entrega.</li>
        <li>Estos plazos sirven para poder comprobar la incidencia y no limitan tus derechos legales.</li>
      </ul>
      <H>11. Atención al cliente y reclamaciones</H>
      <ul>
        <li>Email: <Email /> · Teléfono: <Tel /> · Horario: de 11:00 a 13:00 y de 17:00 a 20:00.</li>
        <li>Tienes hojas de reclamaciones a tu disposición en nuestra tienda. También puedes acudir a Kontsumobide, el Instituto Vasco de Consumo.</li>
      </ul>
      <H>12. Campañas</H>
      <p>Algunas campañas tienen condiciones particulares. Se recogen en el anexo, se muestran en la página de la campaña antes de comprar, forman parte de estas condiciones y, donde digan algo distinto, prevalecen sobre ellas.</p>
      <H>13. Datos personales, cambios y ley aplicable</H>
      <ul>
        <li>Tratamos tus datos según la Política de privacidad.</li>
        <li>Podemos actualizar estas condiciones; a cada pedido se le aplica la versión vigente cuando lo hiciste.</li>
        <li>Se aplica la ley española. Si eres consumidor, son competentes los tribunales de tu domicilio.</li>
      </ul>
      <H id="campanas">Anexo · Campaña de diciembre 2026: Pack de Diciembre</H>
      <ul>
        <li><strong>Producto:</strong> pack cerrado de 6 tartas, una de cada receta indicada. No se puede cambiar ninguna. 30 € por pack, IVA incluido.</li>
        <li><strong>Solo envío a domicilio</strong> en España peninsular, en frío y como kit para montar en casa. Sin recogida en tienda.</li>
        <li><strong>Gastos de envío:</strong> 8,90 € por expedición; cada expedición lleva hasta 2 packs. 1 pack, 38,90 €; 2 packs, 68,90 €; 3 packs, 107,80 € (dos expediciones, que pueden llegar por separado).</li>
        <li><strong>Envío y entrega:</strong> todos los pedidos salen el jueves 17 de diciembre de 2026 con SEUR. Entrega prevista el viernes 18 de diciembre antes de las 13:30. No se puede elegir otro día.</li>
        <li><strong>Unidades limitadas:</strong> 30 packs. La venta se cierra el 16 de diciembre de 2026 a las 16:00 (hora peninsular), o antes si se agotan.</li>
        <li><strong>Cancelación:</strong> gratis hasta el 16 de diciembre de 2026 a las 16:00, por email a <Email /> con tu número de pedido. Reembolso íntegro, envío incluido, en un máximo de 14 días. Después no se puede cancelar.</li>
        <li>Si no se puede entregar por ausencia o datos incorrectos, no hay reembolso ni reenvío. Si llega dañado, incompleto o en mal estado, aplica el punto 10.</li>
      </ul>
    </LegalPage>
  );
}
