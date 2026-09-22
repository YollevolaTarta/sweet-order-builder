import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { WebOrderProvider } from "@/lib/web-order";

export const Route = createFileRoute("/web")({
  component: WebLayout,
});

function WebLayout() {
  return (
    <WebOrderProvider>
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="flex items-center justify-between px-5 pt-4">
          <Link to="/web" className="text-sm font-black tracking-tight">
            Yo Llevo <span className="text-brand-red">la Tarta</span>
          </Link>
        </header>
        <Outlet />
      </div>
    </WebOrderProvider>
  );
}
