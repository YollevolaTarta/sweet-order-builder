import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, H, Tabla } from "@/components/legal-page";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [
    { title: "Política de cookies — Yo Llevo la Tarta" },
    { name: "description", content: "Qué cookies usa yollevolatarta.com, para qué sirven, cuánto duran y cómo decidir sobre ellas." },
    { property: "og:title", content: "Política de cookies — Yo Llevo la Tarta" },
    { property: "og:description", content: "Qué cookies usa yollevolatarta.com, para qué sirven, cuánto duran y cómo decidir sobre ellas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  return (
    <LegalPage title="Política de cookies">
      <p>Las cookies son pequeños archivos que la web guarda en tu dispositivo. Usamos las técnicas, que son necesarias para que la web funcione, y, solo si las aceptas, cookies de publicidad.</p>
      <Tabla head={["Tipo", "Quién", "Para qué", "Duración"]} rows={[
        ["Técnicas (siempre activas)", "Yo Llevo la Tarta", "Que la web y el pedido funcionen, y recordar tu elección sobre cookies", "Durante tu visita; la elección, 12 meses"],
        ["Publicidad (opcional)", "Meta Pixel (_fbp, _fbc)", "Medir las compras que llegan desde nuestros anuncios en Instagram y Facebook, y mostrar anuncios a quien ha visitado la web", "Hasta 90 días"],
      ]} />
      <H>Cómo decides</H>
      <ul>
        <li>Al entrar, puedes <strong>aceptar</strong>, <strong>rechazar</strong> o <strong>configurar</strong> las cookies opcionales. Rechazar es tan fácil como aceptar y no te impide comprar.</li>
        <li>Las cookies de publicidad no se activan hasta que las aceptas.</li>
        <li>Puedes cambiar tu elección cuando quieras desde «Configurar cookies», en el pie de la web.</li>
        <li>También puedes borrarlas desde tu navegador.</li>
      </ul>
      <p>Si aceptas las de publicidad, Meta trata esos datos según su propia política de privacidad. Más información en nuestra <Link to="/privacidad">Política de privacidad</Link>.</p>
    </LegalPage>
  );
}
