import type { Metadata } from "next";
import {
  getSettings,
  ProfileSettingsForm,
  WorkspaceSettingsForm,
} from "@/features/settings";
import { requireWorkspace } from "@/server/authz";

export const metadata: Metadata = { title: "Settings — SubIQ" };

export default async function SettingsPage() {
  const { userId, workspaceId } = await requireWorkspace();
  const { user, workspace } = await getSettings(userId, workspaceId);

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-card border-line bg-surface border p-5">
        <h1 className="text-sm font-medium tracking-tight">Profile</h1>
        <p className="text-muted mt-0.5 text-xs">
          How dates are shown to you across the app.
        </p>
        <div className="mt-4">
          <ProfileSettingsForm
            email={user.email}
            name={user.name}
            timezone={user.timezone}
          />
        </div>
      </section>

      <section className="rounded-card border-line bg-surface border p-5">
        <h2 className="text-sm font-medium tracking-tight">Workspace</h2>
        <p className="text-muted mt-0.5 text-xs">
          Defaults for totals, insights, and new subscriptions.
        </p>
        <div className="mt-4">
          <WorkspaceSettingsForm
            workspaceName={workspace.name}
            defaultCurrency={workspace.defaultCurrency}
          />
        </div>
      </section>
    </div>
  );
}
