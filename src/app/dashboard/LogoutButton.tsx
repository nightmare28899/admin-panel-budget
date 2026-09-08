"use client";

import { logoutAction } from "@/lib/actions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [confirmationOpen, setConfirmationOpen] = useState(false);

    async function handleLogout() {
        setLoading(true);
        await logoutAction();
        router.replace("/");
        router.refresh();
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setConfirmationOpen(true)}
                disabled={loading}
                aria-label={loading ? "Cerrando sesión" : "Cerrar sesión"}
                title={loading ? "Cerrando sesión" : "Cerrar sesión"}
                aria-busy={loading}
                className="inline-flex h-[34px] min-w-[34px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border border-[var(--border-soft)] px-2.5 text-sm text-[var(--text-2)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[var(--rose)]/40 hover:bg-[var(--bg-3)] hover:text-[var(--rose)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none"
            >
                {loading ? (
                    <>
                        <svg className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                        </svg>
                        <span role="status" aria-live="polite">Cerrando sesión…</span>
                    </>
                ) : (
                    <>
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H9" />
                        </svg>
                        <span>Cerrar sesión</span>
                    </>
                )}
            </button>

            <ConfirmModal
                open={confirmationOpen}
                onClose={() => setConfirmationOpen(false)}
                onConfirm={handleLogout}
                title="¿Cerrar sesión?"
                description="Tendrás que volver a ingresar tus credenciales para acceder al panel administrativo."
                confirmLabel="Cerrar sesión"
                confirmingLabel="Cerrando sesión…"
                cancelLabel="Permanecer aquí"
                loading={loading}
            />
        </>
    );
}
