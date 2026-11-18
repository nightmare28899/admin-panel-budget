import { WORKSPACE_APPEARANCE_STORAGE_KEY } from "./workspaceAppearance";
import { WORKSPACE_THEME_STORAGE_KEY } from "./workspaceTheme";

/**
 * Inline script for the root layout <head>: applies the persisted theme and
 * appearance to <html> before hydration so the first paint has no flash.
 * Must mirror the validation of the stores; any storage error is swallowed.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var s=window.localStorage,r=document.documentElement;r.setAttribute("data-theme",s.getItem(${JSON.stringify(WORKSPACE_THEME_STORAGE_KEY)})==="aurora"?"aurora":"classic");r.setAttribute("data-appearance",s.getItem(${JSON.stringify(WORKSPACE_APPEARANCE_STORAGE_KEY)})==="dark"?"dark":"light");}catch(e){}})();`;
