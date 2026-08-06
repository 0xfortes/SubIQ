import type { Metadata } from "next";
import { getSettings, SettingsForm } from "@/features/settings";
import { requireWorkspace } from "@/server/authz";

export const metadata: Metadata = { title: "Settings — SubIQ" };

export default async function SettingsPage() {
  const { userId, workspaceId } = await requireWorkspace();
  const { user, workspace } = await getSettings(userId, workspaceId);

  return (
    <SettingsForm
      email={user.email}
      name={user.name}
      timezone={user.timezone}
      workspaceName={workspace.name}
      defaultCurrency={workspace.defaultCurrency}
    />
  );
}
