import { PageTransition } from "@/components/motion";

// template.tsx (not layout.tsx) — Next re-mounts this on every navigation,
// which is what makes the page transition actually run between routes.
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
