"use client";

import { useEffect, type ReactNode } from "react";
import { ConfigProvider } from "antd";
import { workspaceReferenceTheme, workspaceAccent, type Workspace } from "@/lib/antdTheme";

export type { Workspace };

/**
 * Applies a screenshot-reference workspace theme: sets `data-workspace` on a wrapper (for
 * SSR and descendants) and on <html> (so portals such as modals, which render
 * outside the wrapper, resolve the same CSS variables), and feeds the matching
 * `colorPrimary` to antd.
 */
export function WorkspaceTheme({ workspace, children }: { workspace: Workspace; children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-workspace");
    root.setAttribute("data-workspace", workspace);
    return () => {
      if (previous === null) root.removeAttribute("data-workspace");
      else root.setAttribute("data-workspace", previous);
    };
  }, [workspace]);

  const theme = {
    ...workspaceReferenceTheme,
    inherit: false,
    token: { ...workspaceReferenceTheme.token, colorPrimary: workspaceAccent[workspace] },
  };

  return (
    <div data-workspace={workspace} className="contents">
      <ConfigProvider theme={theme}>{children}</ConfigProvider>
    </div>
  );
}
