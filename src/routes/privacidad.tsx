import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, H, Email, Tabla } from "@/components/legal-page";

export const Route = createFileRoute("/privacidad")({
  head: () => ({ meta: [
    { title: "Política de privacidad — Yo Llevo la Tarta" },
    { name: "description", content: "Qué datos personales trata YO LLEVO LA TARTA, S.L.U., para qué, con quién los comparte y cómo ejercer tus derechos." },
    { property: "og:title", content: "Política de privacidad — Yo Llevo la Tarta" },
    { property: "og:description", content: "Qué datos personales trata YO LLEVO LA TARTA, S.L.U., para qué, con quién los comparte y cómo ejercer tus derechos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  return (
    <LegalPage title="Política de privacidad">
      <H>Responsable</H>
      <p>YO LLEVO LA TARTA, S.L.U., NIF B05730528, C/ Artekale 45, 48005 Bilbao (Bizkaia). Contacto: <Email />.</p>
      <H>Qué datos tratamos y para qué</H>
      <Tabla head={["Para qué", "Datos", "Base legal", "Cuánto tiempo"]} rows={[
        ["Gestionar tu pedido (preparación, pago, entrega o recogida, confirmación)", "Nombre, apellidos, email, teléfono, dirección si es envío, y el pedido", "Ejecución del contrato", "Mientras dura el pedido y, después, los plazos que exige la ley"],
        ["Cumplir obligaciones fiscales y contables, y acreditar que aceptaste las condiciones", "Datos del pedido, importe, versión de las condiciones aceptada y fecha", "Obligación legal", "Los plazos de la normativa mercantil y fiscal (con carácter general, 6 años)"],
        ["Atender consultas, cancelaciones, incidencias y reclamaciones", "Los datos que nos des y los del pedido", "Ejecución del contrato e interés legítimo en resolverlas", "Hasta resolverlas y durante el plazo para reclamar"],
        ["Enviarte promociones por email, solo si marcas la casilla", "Nombre y email", "Tu consentimiento", "Hasta que te des de baja"],
        ["Medir los resultados de nuestros anuncios, solo si aceptas esas cookies", "Datos de navegación", "Tu consentimiento", "Según la Política de cookies"],
      ]} />
      <p>Solo pedimos lo necesario. En los pedidos hechos en la tienda (tablet o QR) no pedimos datos personales. No tomamos decisiones automatizadas con efectos sobre ti.</p>
      <H>Con quién compartimos tus datos</H>
      <p>No vendemos tus datos. Solo los reciben quienes los necesitan para prestar el servicio o porque lo exige la ley:</p>
      <ul>
        <li>la entidad bancaria que gestiona el pago;</li>
        <li>SEUR, para entregar los envíos;</li>
        <li>proveedores tecnológicos que trabajan por encargo nuestro: alojamiento de la web y de la base de datos, envío de emails, correo electrónico y facturación;</li>
        <li>la administración tributaria, cuando lo exige la ley;</li>
        <li>Meta, solo si aceptas las cookies de publicidad.</li>
      </ul>
      <p>Algunos de estos proveedores (por ejemplo, Meta) pueden tratar datos fuera de la Unión Europea. En ese caso la transferencia se ampara en la decisión de adecuación de la Comisión Europea para EE. UU. (Marco de Privacidad de Datos) o en las cláusulas contractuales tipo de la Comisión Europea.</p>
      <H>Tus derechos</H>
      <ul>
        <li>Puedes pedir el acceso, la rectificación o la supresión de tus datos, oponerte a su uso, limitarlo y pedir su portabilidad, escribiendo a <Email />.</li>
        <li>Puedes retirar tu consentimiento en cualquier momento: para los emails comerciales, desde cada email o escribiéndonos; para las cookies, desde «Configurar cookies» en la web.</li>
        <li>Si no estás de acuerdo con nuestra respuesta, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>).</li>
      </ul>
    </LegalPage>
  );
}
