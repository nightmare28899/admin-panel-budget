"use client";

import { useEffect, type ReactNode } from "react";
import { ConfigProvider } from "antd";
import { useWorkspaceAppearance } from "@/hooks/useWorkspaceAppearance";
import { getWorkspaceTheme, type Workspace } from "@/lib/antdTheme";

export type { Workspace };

/** Body-mounted portals must resolve the same workspace and appearance tokens as the shell. */
export function WorkspaceTheme({ workspace, children }: { workspace: Workspace; children: ReactNode }) {
  const { appearance } = useWorkspaceAppearance();

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-workspace");
    const previousAppearance = root.getAttribute("data-appearance");
    root.setAttribute("data-workspace", workspace);
    root.setAttribute("data-appearance", appearance);
    return () => {
      if (previousAppearance === null) root.removeAttribute("data-appearance");
      else root.setAttribute("data-appearance", previousAppearance);
      if (previous === null) root.removeAttribute("data-workspace");
      else root.setAttribute("data-workspace", previous);
    };
  }, [workspace, appearance]);

  const theme = getWorkspaceTheme(workspace, appearance);

  return (
    <div data-workspace={workspace} data-appearance={appearance} className="contents">
      <ConfigProvider theme={theme}>{children}</ConfigProvider>
    </div>
  );
}
