/**
 * Pagine fuori dalla shell autenticata (login, registrazione, profilo).
 *
 * Il contenitore centrato vive qui e non nel root layout: quando l'area
 * autenticata (app) arrivera, dovra poter uscire da questo max-width senza
 * margini negativi ovunque. I route group non compaiono negli URL, quindi
 * /login e /register restano tali.
 */
export default function StandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-8 pt-6 sm:max-w-2xl sm:px-6 lg:max-w-7xl lg:px-8 lg:pb-12 lg:pt-8 2xl:max-w-[1500px]">
      {children}
    </main>
  );
}
