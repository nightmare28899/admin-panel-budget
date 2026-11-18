"use client";

import { useEffect, type ReactNode } from "react";
import { ConfigProvider } from "antd";
import { useWorkspaceAppearance } from "@/hooks/useWorkspaceAppearance";
import { useWorkspaceThemeVariant } from "@/hooks/useWorkspaceThemeVariant";
import { getWorkspaceTheme, type Workspace } from "@/lib/antdTheme";

export type { Workspace };

/** Body-mounted portals must resolve the same workspace and appearance tokens as the shell. */
export function WorkspaceTheme({ workspace, children }: { workspace: Workspace; children: ReactNode }) {
  const { appearance } = useWorkspaceAppearance();
  const { variant } = useWorkspaceThemeVariant();

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-workspace");
    const previousAppearance = root.getAttribute("data-appearance");
    const previousTheme = root.getAttribute("data-theme");
    root.setAttribute("data-workspace", workspace);
    root.setAttribute("data-appearance", appearance);
    root.setAttribute("data-theme", variant);
    return () => {
      if (previousTheme === null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", previousTheme);
      if (previousAppearance === null) root.removeAttribute("data-appearance");
      else root.setAttribute("data-appearance", previousAppearance);
      if (previous === null) root.removeAttribute("data-workspace");
      else root.setAttribute("data-workspace", previous);
    };
  }, [workspace, appearance, variant]);

  const theme = getWorkspaceTheme(workspace, appearance, variant);

  return (
    <div data-workspace={workspace} data-appearance={appearance} data-theme={variant} className="contents">
      <ConfigProvider theme={theme}>{children}</ConfigProvider>
    </div>
  );
}
