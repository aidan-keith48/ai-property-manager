import { Building2 } from "lucide-react";

import { PortalTabBar } from "@/components/portal-tab-bar";

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    // data-surface="editorial" re-points --primary at near-black for this whole
    // subtree, so every button, link, focus ring and the tab bar's active state
    // follow without any of them opting in. See globals.css.
    <div data-surface="editorial" className="flex flex-1 flex-col">
      <header className="bg-card">
        <div className="mx-auto flex max-w-lg items-center gap-2.5 px-4 py-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </span>
          <span className="font-heading text-sm font-bold tracking-tight text-foreground">
            Tenant Portal
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-24">{children}</main>
      <PortalTabBar />
    </div>
  );
}
