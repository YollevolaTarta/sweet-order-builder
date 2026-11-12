import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  const cls = "underline-offset-4 hover:underline";
  return (
    <footer className="mt-auto border-t border-border px-5 py-6 text-sm text-muted-foreground">
      <nav aria-label="Información legal" className="flex flex-wrap gap-x-5 gap-y-2">
        <Link to="/aviso-legal" className={cls}>Aviso legal</Link>
        <Link to="/condiciones" className={cls}>Condiciones de compra</Link>
        <Link to="/privacidad" className={cls}>Privacidad</Link>
        <Link to="/cookies" className={cls}>Cookies</Link>
        <Link to="/alergenos" className={cls}>Alérgenos</Link>
        {/* Hueco reservado para «Configurar cookies»: llegará con la tarea del banner. */}
        <span data-slot="configurar-cookies" hidden />
      </nav>
    </footer>
  );
}
