import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, H, Email } from "@/components/legal-page";

export const Route = createFileRoute("/alergenos")({
  head: () => ({ meta: [
    { title: "Alérgenos y conservación — Yo Llevo la Tarta" },
    { name: "description", content: "Cómo informamos de los alérgenos de nuestros postres, trazas en el obrador y conservación de los productos." },
    { property: "og:title", content: "Alérgenos y conservación — Yo Llevo la Tarta" },
    { property: "og:description", content: "Cómo informamos de los alérgenos de nuestros postres, trazas en el obrador y conservación de los productos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  return (
    <LegalPage title="Alérgenos y conservación">
      <p><strong>Todos nuestros postres llevan base de galleta y se elaboran en un obrador donde se manipulan gluten, frutos de cáscara, sésamo, leche y huevo. Pueden contener trazas de cualquiera de ellos.</strong></p>
      <H>Cómo leer la información de cada producto</H>
      <ul>
        <li>Junto a cada ingrediente, receta, pack o tarta indicamos los alérgenos que contiene, de entre los 14 de declaración obligatoria.</li>
        <li>Si configuras tu postre, antes de pagar ves los alérgenos de todo lo que has elegido.</li>
        <li>En los productos cerrados (recetas, packs y campañas) ves los alérgenos de cada tarta: crema, topping y crumble.</li>
      </ul>
      <H>Si tienes una alergia o intolerancia</H>
      <p>No podemos garantizar la ausencia de trazas. Si tienes una alergia o intolerancia, revisa tu pedido antes de pagar y escríbenos a <Email /> antes de comprar si tienes cualquier duda.</p>
      <H>Conservación</H>
      <p>Conserva cada producto según su etiqueta y sus instrucciones. Cada ingrediente del kit de envío lleva su propia etiqueta, con su fecha.</p>
      <H>Elaborado por</H>
      <p>YO LLEVO LA TARTA, S.L.U. · C/ Artekale 45, 48005 Bilbao (Bizkaia).</p>
    </LegalPage>
  );
}
