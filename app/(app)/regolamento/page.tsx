"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Callout,
  List,
  ListItem,
  Paragraph,
  RegolamentoBody,
  Section,
  StatisticheBody,
} from "@/components/tournament/RegolamentoContent";

const NAV_ITEMS = [
  { id: "come-funziona", label: "Regolamento completo" },
  { id: "panchina-sostituzioni", label: "Panchina e sostituzioni" },
  { id: "punteggio", label: "Voto, bonus e malus" },
  { id: "statistiche", label: "Tabella statistiche" },
];

export default function RegolamentoPage() {
  const [activeId, setActiveId] = useState(NAV_ITEMS[0].id);

  // Segue la sezione visibile mentre si scorre, cosi' il tab attivo resta
  // coerente con quello che si sta leggendo, non solo con l'ultimo click.
  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (element): element is HTMLElement => Boolean(element),
    );

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -70% 0px", threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="py-4 lg:py-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#3AF5D4] transition hover:text-[#E9FFFA]"
      >
        <ArrowLeftIcon />
        Torna ai tornei
      </Link>

      <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#1E3448] bg-[#0F1E2E] sm:border-[#22E6C3]/25">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/banner-torneo.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,17,27,0.9)_0%,rgba(6,17,27,0.7)_100%)]" />
        <div className="relative p-5 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#1ED8B7]">Fantashot</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-4xl">Regolamento</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Come funzionano i tornei, come si costruisce la formazione, come vengono calcolati voto, bonus
            e malus e come funzionano le sostituzioni dalla panchina.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <nav className="scrollbar-hide top-20 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:sticky lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
          {NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;

            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveId(item.id)}
                aria-current={isActive ? "true" : undefined}
                className={`shrink-0 rounded-lg border px-3.5 py-2.5 text-xs font-bold transition lg:border-0 lg:px-3 lg:py-2 lg:text-left ${
                  isActive
                    ? "border-[#22E6C3]/50 bg-[#22E6C3]/15 text-white lg:bg-[#22E6C3]/15 lg:text-[#3AF5D4]"
                    : "border-white/10 bg-[#0F1E2E]/80 text-zinc-300 hover:border-[#22E6C3]/40 hover:text-white lg:bg-transparent lg:hover:bg-white/5"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-8">
          <div id="come-funziona" className="scroll-mt-24 space-y-4">
            <RegolamentoBody />
          </div>

          <div id="panchina-sostituzioni" className="scroll-mt-24">
            <SostituzioniIllustrate />
          </div>

          <div id="punteggio" className="scroll-mt-24">
            <PunteggioIllustrate />
          </div>

          <div id="statistiche" className="scroll-mt-24 space-y-4">
            <StatisticheBody />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sostituzioni, spiegate con un esempio finto ma realistico: stessa lingua
 * visiva delle card vere (frecce, colori, badge) cosi' l'utente riconosce
 * subito cosa vede poi sul campo.
 */
function SostituzioniIllustrate() {
  return (
    <Section step="" title="Panchina e sostituzioni">
      <Paragraph>
        La panchina ha 7 riserve fisse: 1 portiere, 2 difensori, 2 centrocampisti, 2 attaccanti. Se un
        titolare non scende in campo, o esce dal campo prima della fine, entra automaticamente la prima
        riserva disponibile dello stesso ruolo.
      </Paragraph>

      <Callout tone="accent" title="Regola dei 15 minuti">
        Un giocatore riceve il voto (e quindi punteggio) solo se gioca almeno 15 minuti. Sotto i 15 minuti
        risulta &ldquo;non ha giocato&rdquo;, a meno che non realizzi comunque un evento che vale punti (gol,
        assist, rigore, cartellino, autogol): in quel caso il punteggio di quell&apos;evento viene comunque
        assegnato, anche con pochi minuti in campo.
      </Callout>

      <p className="mt-1 text-xs font-black uppercase tracking-wide text-zinc-500">Esempio</p>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
          <ExamplePlayer
            name="Titolare"
            sub="8 min in campo"
            badge={{ tone: "out", label: "Esce" }}
          />
          <ArrowRightIcon />
          <ExamplePlayer
            name="Riserva"
            sub="82 min in campo · 6,4 pt"
            badge={{ tone: "in", label: "Entra" }}
          />
        </div>
        <div className="border-t border-white/10 bg-black/30 px-4 py-3 text-xs leading-5 text-zinc-400">
          Il titolare ha giocato solo 8 minuti, sotto la soglia: risulta{" "}
          <span className="font-bold text-zinc-300">&ldquo;non ha giocato&rdquo;</span> e non prende voto. La
          riserva entra al suo posto, gioca 82 minuti e prende regolarmente punteggio: i suoi punti
          sostituiscono quelli del titolare nel calcolo finale della squadra.
        </div>
      </div>

      <p className="mt-4 text-xs font-black uppercase tracking-wide text-zinc-500">Come si vede sul campo</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldCardExample
          label="Titolare sostituito"
          badgeTone="out"
          statusLabel="Assente"
          statusTone="muted"
        />
        <FieldCardExample
          label="Riserva entrata"
          badgeTone="in"
          statusLabel="6,4 pt"
          statusTone="points"
        />
      </div>
      <Paragraph>
        La freccia rossa verso il basso indica chi <strong className="text-white">esce</strong>, quella verde
        verso l&apos;alto indica chi <strong className="text-white">entra</strong>. Toccando un giocatore
        coinvolto in una sostituzione si apre la sua scheda, con un collegamento diretto all&apos;altro
        giocatore della coppia.
      </Paragraph>

      <p className="mt-4 text-xs font-black uppercase tracking-wide text-zinc-500">Panchina, formato reale</p>
      <div className="scrollbar-hide flex gap-3 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3.5">
        <BenchExample name="Ulreich" role="P" sub="Riserva" />
        <BenchExample name="Köhn" role="D" sub="Riserva" />
        <BenchExample name="Acheampong" role="D" sub="6,84 pt" entered captain />
        <BenchExample name="Pellegrini" role="C" sub="Riserva" />
        <BenchExample name="Kimmich" role="C" sub="Riserva" />
      </div>
      <Paragraph>
        Una freccia verde in alto a sinistra sulla foto indica una riserva già entrata in campo. Se la
        riserva è anche il capitano designato, la stellina ambra resta visibile insieme alla freccia.
      </Paragraph>
    </Section>
  );
}

function ExamplePlayer({
  name,
  sub,
  badge,
}: {
  name: string;
  sub: string;
  badge: { tone: "in" | "out"; label: string };
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="relative shrink-0">
        <span
          className={`grid h-11 w-11 place-items-center rounded-full border-2 bg-[#0F1E2E] text-[10px] font-black text-zinc-400 ${
            badge.tone === "out" ? "border-red-500/50" : "border-green-500"
          }`}
        >
          {badge.tone === "out" ? "TI" : "RI"}
        </span>
        <span
          className={`absolute -bottom-1 -left-1 grid h-4 w-4 place-items-center rounded-full border border-[#06111B] ${
            badge.tone === "out" ? "bg-red-500 text-white" : "bg-green-500 text-[#06111B]"
          }`}
        >
          <SubstitutionArrowIcon direction={badge.tone === "in" ? "up" : "down"} />
        </span>
      </span>
      <div className="min-w-0">
        <p
          className={`truncate text-xs font-black uppercase tracking-wide ${
            badge.tone === "out" ? "text-red-400" : "text-green-400"
          }`}
        >
          {badge.label}
        </p>
        <p className="truncate text-sm font-bold text-white">{name}</p>
        <p className="truncate text-[11px] text-zinc-500">{sub}</p>
      </div>
    </div>
  );
}

function FieldCardExample({
  label,
  badgeTone,
  statusLabel,
  statusTone,
}: {
  label: string;
  badgeTone: "in" | "out";
  statusLabel: string;
  statusTone: "muted" | "points";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3.5">
      <span className="relative shrink-0">
        <span
          className={`grid h-12 w-12 place-items-center rounded-full border-2 bg-[#0F1E2E] text-[10px] font-black text-zinc-500 ${
            badgeTone === "out" ? "border-zinc-600" : "border-[#22E6C3]"
          }`}
        >
          {badgeTone === "out" ? (
            <span className="opacity-40 grayscale">FOTO</span>
          ) : (
            "FOTO"
          )}
        </span>
        <span
          className={`absolute -bottom-1 -left-1 grid h-4 w-4 place-items-center rounded-full border border-[#06111B] ${
            badgeTone === "out" ? "bg-red-500 text-white" : "bg-green-500 text-[#06111B]"
          }`}
        >
          <SubstitutionArrowIcon direction={badgeTone === "in" ? "up" : "down"} />
        </span>
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">{label}</p>
        {statusTone === "muted" ? (
          <span className="mt-1 inline-block rounded-full border border-zinc-600 bg-zinc-800/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-zinc-400">
            {statusLabel}
          </span>
        ) : (
          <span className="mt-1 inline-block rounded-full border border-[#22E6C3]/35 bg-[#123A3B]/90 px-2 py-0.5 text-[10px] font-black text-[#3AF5D4]">
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function BenchExample({
  name,
  role,
  sub,
  entered = false,
  captain = false,
}: {
  name: string;
  role: string;
  sub: string;
  entered?: boolean;
  captain?: boolean;
}) {
  const roleColor = { P: "#F6C343", D: "#3B82F6", C: "#22C55E", A: "#EF4444" }[role] ?? "#22E6C3";

  return (
    <div className="flex w-[72px] shrink-0 flex-col items-center gap-1">
      <span className="relative">
        <span
          className="grid h-10 w-10 place-items-center rounded-full border-2 bg-[#0F1E2E] text-[9px] font-black text-zinc-500"
          style={{ borderColor: roleColor }}
        >
          {name.slice(0, 2).toUpperCase()}
        </span>
        <span
          className="absolute -bottom-1 -left-1 grid h-4 w-4 place-items-center rounded-full border border-[#06111B] text-[8px] font-black"
          style={{ backgroundColor: roleColor, color: "#06111B" }}
        >
          {role}
        </span>
        {captain ? (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-[8px] font-black text-black">
            ★
          </span>
        ) : null}
        {entered ? (
          <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-[#06111B] bg-green-500 text-[#06111B]">
            <SubstitutionArrowIcon direction="up" />
          </span>
        ) : null}
      </span>
      <span className="max-w-[68px] truncate text-[9px] font-bold text-white">{name}</span>
      {entered ? (
        <span className="rounded-full border border-[#22E6C3]/35 bg-[#123A3B]/90 px-1.5 py-0.5 text-[8px] font-black text-[#3AF5D4]">
          {sub}
        </span>
      ) : (
        <span className="rounded-full border border-zinc-600 bg-zinc-800/90 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-zinc-400">
          {sub}
        </span>
      )}
    </div>
  );
}

function SubstitutionArrowIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      aria-hidden="true"
      className="h-2.5 w-2.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "up" ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0 text-zinc-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * Scheda punteggio giocatore, spiegata con l'esempio del regolamento
 * (numeri realistici, gia' coerenti con StatisticheBody sotto).
 */
function PunteggioIllustrate() {
  const base = 7;
  const bonus = 0.3;
  const malus = 0.7;
  const total = base + bonus - malus;
  const magnitude = base + bonus + malus;
  const baseShare = (base / magnitude) * 100;
  const bonusShare = (bonus / magnitude) * 100;
  const malusShare = (malus / magnitude) * 100;

  return (
    <Section step="" title="Voto, bonus e malus: come leggere la scheda giocatore">
      <Paragraph>
        Ogni giocatore ha tre componenti separate, sempre in questo ordine:{" "}
        <strong className="text-white">Base</strong> (il voto della prestazione, minimo 15 minuti in campo),{" "}
        <strong className="text-green-400">Bonus</strong> (gol, assist, tiri in porta, parate...) e{" "}
        <strong className="text-red-400">Malus</strong> (ammonizioni, falli, gol subiti dal portiere...).
        Il totale è <span className="font-mono text-white">Base + Bonus − Malus</span>.
      </Paragraph>

      <div className="rounded-xl border border-[#1E3448] bg-[#101D2C] p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-zinc-300">Esempio: centrocampista, 90&apos; giocati</p>
          <p className="text-2xl font-black text-[#3AF5D4]">{formatIt(total)} <span className="text-xs text-zinc-500">pt</span></p>
        </div>

        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-black/40">
          <div className="h-full bg-zinc-400" style={{ width: `${baseShare}%` }} />
          <div className="h-full bg-green-400" style={{ width: `${bonusShare}%` }} />
          <div className="h-full bg-red-400" style={{ width: `${malusShare}%` }} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" /> Base
            </p>
            <p className="mt-1 text-base font-black text-white">{base}</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Bonus
            </p>
            <p className="mt-1 text-base font-black text-green-400">+{formatIt(bonus)}</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Malus
            </p>
            <p className="mt-1 text-base font-black text-red-400">−{formatIt(malus)}</p>
          </div>
        </div>
      </div>

      <p className="mt-2 rounded-lg border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-zinc-200">
        {base} + {formatIt(bonus)} &minus; {formatIt(malus)} = <strong className="text-white">{formatIt(total)} punti</strong>
      </p>

      <Paragraph>
        Nella scheda di ogni giocatore, sotto ai tre numeri, trovi l&apos;elenco di ogni statistica registrata
        (gol, falli, cartellini, tiri...) con il relativo peso in punti: puoi filtrare la lista su{" "}
        <strong className="text-white">Tutte</strong>, solo <strong className="text-green-400">Bonus</strong> o
        solo <strong className="text-red-400">Malus</strong> per capire subito da cosa arriva il punteggio.
      </Paragraph>

      <Callout tone="accent" title="Bonus capitano">
        Il capitano riceve un bonus pari al 20% del proprio punteggio totale. Esempio: 8,5 punti → bonus
        1,70 → totale 10,2 punti. Se il capitano è tra i titolari sostituiti (meno di 15 minuti giocati),
        il bonus non si applica: conta il punteggio reale ottenuto, non quello previsto in formazione.
      </Callout>

      <List>
        <ListItem title="Voto minimo 15'">Sotto i 15 minuti niente voto, salvo eventi che valgono punti.</ListItem>
        <ListItem title="Bonus e malus si sommano">Più eventi nella stessa partita si accumulano tutti.</ListItem>
        <ListItem title="Solo la partita conta">
          Statistiche e punteggio riguardano esclusivamente le partite incluse nel torneo, non l&apos;intera
          stagione del giocatore.
        </ListItem>
      </List>
    </Section>
  );
}

function formatIt(value: number) {
  return value.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
