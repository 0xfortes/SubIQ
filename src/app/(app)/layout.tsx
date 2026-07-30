import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  CategoryAccordion,
  fetchWorkspaceSubs,
  getDashboardData,
} from "@/features/dashboard";
import { countActiveInsights } from "@/features/insights";
import { listCategories } from "@/features/subscriptions";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { requireWorkspace } from "@/server/authz";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { workspaceId } = await requireWorkspace();
  // fetchWorkspaceSubs is request-cached and already runs inside
  // getDashboardData, so the extra call costs nothing. Palette categories
  // come from listCategories (all of them), not the accordion (spend only).
  const [data, insightCount, [, subs], categories] = await Promise.all([
    getDashboardData(workspaceId),
    countActiveInsights(workspaceId),
    fetchWorkspaceSubs(workspaceId),
    listCategories(workspaceId),
  ]);

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar
        email={session.user.email ?? null}
        insightCount={insightCount}
        categories={<CategoryAccordion categories={data.accordion} />}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          categories={categories.map(({ slug, name, color }) => ({
            slug,
            name,
            color,
          }))}
          subs={subs.map(({ id, name }) => ({ id, name }))}
          mobileNav={
            <MobileNav
              email={session.user.email ?? null}
              insightCount={insightCount}
              categories={<CategoryAccordion categories={data.accordion} />}
            />
          }
        />
        <main className="max-w-content mx-auto w-full flex-1 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
