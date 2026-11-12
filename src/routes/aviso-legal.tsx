import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, H, Email, Tel } from "@/components/legal-page";

export const Route = createFileRoute("/aviso-legal")({
  head: () => ({ meta: [
    { title: "Aviso legal — Yo Llevo la Tarta" },
    { name: "description", content: "Titular de yollevolatarta.com, condiciones de uso de la web, propiedad intelectual y ley aplicable." },
    { property: "og:title", content: "Aviso legal — Yo Llevo la Tarta" },
    { property: "og:description", content: "Titular de yollevolatarta.com, condiciones de uso de la web, propiedad intelectual y ley aplicable." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  return (
    <LegalPage title="Aviso legal">
      <H>Titular de la web</H>
      <p>yollevolatarta.com pertenece a:</p>
      <ul>
        <li>YO LLEVO LA TARTA, S.L.U. (sociedad unipersonal)</li>
        <li>NIF B05730528</li>
        <li>Domicilio social: C/ Artekale 45, 48005 Bilbao (Bizkaia)</li>
        <li>Inscrita en el Registro Mercantil de Bizkaia, hoja BI-88544, inscripción 1.ª.</li>
        <li>Email: <Email /> · Teléfono: <Tel /></li>
        <li>Actividad: elaboración y venta de postres en tienda física y online.</li>
      </ul>
      <H>Uso de la web</H>
      <p>Puedes navegar libremente y sin registro. Al usarla te comprometes a hacer solo pedidos reales, a dar datos veraces y a no dañar la web. Las compras se rigen por las Condiciones de compra.</p>
      <H>Propiedad intelectual</H>
      <p>Los textos, fotos, diseño, logotipo y marca pertenecen a YO LLEVO LA TARTA, S.L.U. o a terceros que han autorizado su uso. No puedes copiarlos ni usarlos con fines comerciales sin nuestro permiso por escrito.</p>
      <H>Responsabilidad</H>
      <p>Trabajamos para que la web funcione bien y su información sea correcta, pero no podemos garantizar que nunca haya interrupciones o errores técnicos. No respondemos del contenido de las webs a las que enlazamos.</p>
      <H>Ley aplicable</H>
      <p>Se aplica la ley española. Si eres consumidor, son competentes los tribunales de tu domicilio.</p>
    </LegalPage>
  );
}
