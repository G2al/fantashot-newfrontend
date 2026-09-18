"use client";

import { AppShell } from "@/components/AppShell";
import { LobbyFiltersProvider } from "@/components/lobby/LobbyFiltersProvider";

/**
 * Shell persistente condiviso fra lobby e dettaglio torneo. Durante la
 * navigazione cambiano solo i children: sidebar, filtri e stato UI restano.
 */
export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LobbyFiltersProvider>
      <AppShell>{children}</AppShell>
    </LobbyFiltersProvider>
  );
}
