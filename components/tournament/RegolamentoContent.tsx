"use client";

import { useState } from "react";

type RegulationTab = "regolamento" | "statistiche";

/**
 * Testo unico del regolamento e delle statistiche, valido per tutti i
 * tornei (non e’ specifico del singolo torneo, quindi e’ statico qui).
 */
export function RegolamentoContent() {
  const [tab, setTab] = useState<RegulationTab>("regolamento");

  return (
    <div>
      <div className="mb-5 grid max-w-xs grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
        <SubTabButton
          isActive={tab === "regolamento"}
          onClick={() => setTab("regolamento")}
        >
          Regolamento
        </SubTabButton>
        <SubTabButton
          isActive={tab === "statistiche"}
          onClick={() => setTab("statistiche")}
        >
          Statistiche
        </SubTabButton>
      </div>

      {tab === "regolamento" ? <RegolamentoBody /> : <StatisticheBody />}
    </div>
  );
}

function SubTabButton({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
        isActive
          ? "bg-[#22E6C3] text-[#06111B] shadow-[0_0_18px_rgba(34,230,195,0.35)]"
          : "text-zinc-400 hover:text-[#E9FFFA]"
      }`}
    >
      {children}
    </button>
  );
}

function RegolamentoBody() {
  let step = 0;
  const nextStep = () => String(++step).padStart(2, "0");

  return (
    <div className="space-y-4">
      <Section step={nextStep()} title="Cos’e’ Fantashot">
        <Paragraph>
          Fantashot e’ un fantasy game calcistico basato sulle prestazioni
          reali dei calciatori. A differenza del fantacalcio tradizionale, che
          normalmente dura per un&apos;intera stagione, Fantashot permette di
          partecipare a tornei piu’ brevi, costruiti utilizzando una
          selezione precisa di partite reali.
        </Paragraph>
        <Paragraph>
          Ogni torneo ha le proprie partite, una data di chiusura delle
          iscrizioni, un eventuale costo di partecipazione, un numero minimo e
          massimo di partecipanti, un montepremi, una classifica e una
          distribuzione dei premi. Al termine del torneo vengono calcolati i
          punteggi definitivi e assegnati gli eventuali premi.
        </Paragraph>
      </Section>

      <Section step={nextStep()} title="Obiettivo del gioco">
        <Paragraph>
          L&apos;obiettivo e’ creare la migliore formazione possibile
          utilizzando i calciatori disponibili nel torneo. I giocatori della
          formazione ottengono punti in base alle loro prestazioni nelle
          partite reali incluse nel torneo.
        </Paragraph>
        <Paragraph>
          Vince chi totalizza il punteggio di squadra piu’ alto, considerando
          voto base, bonus, malus, bonus del capitano, eventuali sostituzioni
          dalla panchina e i criteri di spareggio in caso di parita’.
        </Paragraph>
      </Section>

      <Section step={nextStep()} title="Tipologie di torneo">
        <List>
          <ListItem title="Free Roll">
            Iscrizione gratuita e montepremi prestabilito.
          </ListItem>
          <ListItem title="Free Speed">
            Torneo gratuito e veloce che considera esclusivamente il primo
            tempo delle partite selezionate.
          </ListItem>
          <ListItem title="Torneo Garantito">
            Il montepremi e’ garantito indipendentemente dal numero effettivo
            di partecipanti.
          </ListItem>
          <ListItem title="Fantatwo">
            Torneo testa a testa tra due utenti: uno contro uno.
          </ListItem>
          <ListItem title="Torneo Privato">
            Creato da un utente e accessibile solamente tramite una passkey
            fornita dal creatore.
          </ListItem>
        </List>
        <Paragraph>
          Ogni torneo puo’ avere condizioni differenti (quota, numero massimo
          di partecipanti, orario di chiusura, distribuzione premi): vanno
          sempre controllate nella scheda del singolo torneo.
        </Paragraph>
      </Section>

      <Section step={nextStep()} title="Creazione della formazione">
        <Paragraph>
          Prima della chiusura delle iscrizioni ogni partecipante deve
          completare la propria formazione, gestibile sia tramite la
          rappresentazione grafica del campo sia tramite la lista dei
          calciatori: rappresentano la stessa squadra e permettono di gestire
          titolari e panchina.
        </Paragraph>
        <Paragraph>
          Bisogna scegliere uno dei moduli disponibili nel torneo e inserire
          un giocatore in ogni posizione richiesta, rispettando il ruolo
          (portiere, difensore, centrocampista, attaccante).
        </Paragraph>
        <Paragraph>
          E&apos; disponibile una funzione per generare o completare
          automaticamente la formazione in modo casuale; puo’ essere
          modificata liberamente prima della chiusura delle iscrizioni.
        </Paragraph>
        <Callout tone="accent" title="Capitano">
          Ogni formazione deve avere un capitano, che riceve un bonus pari al
          20% del proprio punteggio ed e’ decisivo anche negli spareggi in
          caso di parita’. Esempio: punteggio 8,5 &rarr; bonus 1,7 &rarr;
          totale 10,2 punti.
        </Callout>
      </Section>

      <Section step={nextStep()} title="Gestione della panchina">
        <Paragraph>
          La panchina e’ composta da 7 riserve fisse: 1 portiere, 2
          difensori, 2 centrocampisti, 2 attaccanti.
        </Paragraph>
        <Paragraph>
          Se un titolare non scende in campo, entra il primo panchinaro
          disponibile dello stesso ruolo. Il panchinaro riceve normalmente il
          voto se disputa almeno 15 minuti; se gioca meno ma realizza un
          evento significativo (gol, assist, malus importante) riceve
          comunque il relativo punteggio.
        </Paragraph>
      </Section>

      <Section step={nextStep()} title="Svolgimento del torneo">
        <Paragraph>
          <strong className="text-white">Prima della chiusura:</strong> ci si
          puo’ iscrivere, scegliere modulo e calciatori, completare la
          panchina, nominare il capitano e modificare la formazione. Per
          partecipare la formazione deve essere completa.
        </Paragraph>
        <Paragraph>
          <strong className="text-white">Chiusura delle iscrizioni:</strong>{" "}
          non e’ piu’ possibile partecipare, le formazioni di tutti i
          partecipanti diventano visibili e il torneo entra nella fase di
          svolgimento. Restano nascoste prima di questo momento per evitare
          che gli utenti copino le scelte degli avversari.
        </Paragraph>
        <Paragraph>
          <strong className="text-white">Durante il torneo</strong> e’
          possibile seguire classifica live, punteggio di squadre e singoli
          calciatori, minuti giocati, voto base, bonus, malus, statistiche
          dettagliate ed eventi principali delle partite. I punteggi
          provvisori possono cambiare fino alla validazione definitiva dei
          dati.
        </Paragraph>
        <Paragraph>
          <strong className="text-white">Fine del torneo:</strong> viene
          elaborato il referto finale, che stabilisce posizione, punteggio
          definitivo, vincitori e premi assegnati.
        </Paragraph>
      </Section>

      <Section step={nextStep()} title="Spareggi in caso di parita’">
        <Paragraph>
          Primo criterio: punti sanzione (giallo = 1, rosso = 2). Vince la
          formazione con meno punti sanzione. Esempio: Squadra A 5 gialli + 1
          rosso = 7 punti; Squadra B 3 gialli + 1 rosso = 5 punti &rarr; vince
          B.
        </Paragraph>
        <Paragraph>
          Secondo criterio (se ancora in parita’): vince la squadra il cui
          capitano ha il punteggio piu’ alto.
        </Paragraph>
      </Section>

      <Section step={nextStep()} title="Classifica e visibilita’">
        <Paragraph>
          La classifica ordina le formazioni dal punteggio piu’ alto e puo’
          essere provvisoria durante il torneo: diventa definitiva solo dopo
          la conclusione delle partite e la conferma dei risultati.
        </Paragraph>
        <Paragraph>
          Dopo la chiusura delle iscrizioni sono visibili le formazioni degli
          altri partecipanti: titolari, panchina, capitano, modulo,
          punteggi, minuti giocati e statistiche.
        </Paragraph>
      </Section>

      <Section step={nextStep()} title="Premi e payout">
        <Paragraph>
          Viene premiato il 15% dei partecipanti (es. 100 iscritti &rarr; primi
          15 premiati; 1.000 iscritti &rarr; primi 150). La distribuzione precisa
          tra le posizioni si trova nella sezione &ldquo;Premi&rdquo; del
          singolo torneo.
        </Paragraph>
        <Paragraph>
          Distribuzione indicata dal regolamento: 13% del totale delle
          iscrizioni al montepremi, 2% al jackpot. La formula 13% + 2% sara’
          applicata quando il sistema jackpot sara’ disponibile.
        </Paragraph>
      </Section>

      <Section step={nextStep()} title="Jackpot e Ruota della Fortuna">
        <Paragraph>
          Il jackpot e’ un montepremi cumulativo che cresce progressivamente,
          vincibile tramite la Ruota della Fortuna (una volta ogni 24 ore).
        </Paragraph>
        <Paragraph>
          La ruota ha 8 esiti possibili: 4 caselle &ldquo;Ritenta
          domani&rdquo; (nessun premio), 1 premio da 3&nbsp;&euro;, 1 da
          5&nbsp;&euro;, 1 da 7&nbsp;&euro;, 1 jackpot. Chi vince il jackpot
          riceve il 70% del montepremi disponibile; il restante 30% passa al
          jackpot successivo.
        </Paragraph>
      </Section>

      <Section step={nextStep()} title="Sezioni principali del gioco">
        <List>
          <ListItem title="Tornei disponibili">
            Tornei ancora aperti alle iscrizioni.
          </ListItem>
          <ListItem title="Tornei attivi">
            Tornei a cui sei iscritto e ancora in corso.
          </ListItem>
          <ListItem title="Tornei terminati">
            Tornei conclusi, visibili in home per 30 giorni.
          </ListItem>
          <ListItem title="I miei tornei">
            Storico completo: stato, posizione finale, punti, premio, formazione
            usata, report, movimenti economici collegati.
          </ListItem>
          <ListItem title="Transazioni">
            Storico delle operazioni sul conto (iscrizioni, vincite).
          </ListItem>
        </List>
      </Section>

      <Section step={nextStep()} title="Fair play">
        <Paragraph>
          Le formazioni degli avversari restano nascoste fino alla chiusura
          delle iscrizioni, i punteggi si basano sui dati delle partite
          reali, la classifica definitiva arriva solo dopo il referto finale
          e i premi vengono assegnati in base a classifica definitiva ed
          eventuali criteri di spareggio.
        </Paragraph>
      </Section>

      <Section step={nextStep()} title="Riepilogo rapido">
        <List numbered>
          <ListItem title="Scegli il torneo" />
          <ListItem title="Controlla quota, montepremi, partite e scadenza" />
          <ListItem title="Scegli un modulo" />
          <ListItem title="Completa tutte le posizioni dei titolari" />
          <ListItem title="Completa i 7 posti in panchina" />
          <ListItem title="Scegli il capitano" />
          <ListItem title="Conferma l’iscrizione prima della scadenza" />
          <ListItem title="Attendi l’inizio delle partite" />
          <ListItem title="Segui statistiche, punteggi e classifica live" />
          <ListItem title="Attendi il referto finale per classifica e premi" />
        </List>
      </Section>
    </div>
  );
}

function StatisticheBody() {
  return (
    <div className="space-y-4">
      <Section step="01" title="Calcolo del punteggio">
        <Paragraph>
          Il punteggio di ogni calciatore e’ formato da:{" "}
          <strong className="text-white">voto base + bonus &minus; malus</strong>.
          Il punteggio complessivo della formazione e’ la somma dei punteggi
          validi dei calciatori schierati, considerando eventuali sostituzioni
          e il bonus del capitano.
        </Paragraph>
      </Section>

      <Section step="02" title="Voto base: 6 punti">
        <Paragraph>
          Un calciatore riceve il voto base di 6 punti se disputa almeno 15
          minuti. Un ingresso dopo il 75&deg; minuto senza azioni
          significative non riceve voto; lo riceve comunque se realizza un
          bonus o malus importante (gol, assist, rigore parato/sbagliato,
          autogol, cartellino giallo/rosso, gol subito dal portiere), anche
          sotto i 15 minuti.
        </Paragraph>
      </Section>

      <Section step="03" title="Bonus">
        <StatTable
          tone="positive"
          rows={[
            { label: "Gol", value: "+3" },
            { label: "Assist", value: "+1" },
            { label: "Tiro in porta", value: "+0,10" },
            { label: "Palo o traversa", value: "+0,10" },
            { label: "Passaggio chiave", value: "+0,10" },
            { label: "Parata (portiere)", value: "+0,10" },
            { label: "Rigore parato", value: "+3" },
          ]}
        />
      </Section>

      <Section step="04" title="Malus">
        <StatTable
          tone="negative"
          rows={[
            { label: "Gol subito (solo portiere)", value: "-1" },
            { label: "Cartellino giallo", value: "-0,50" },
            { label: "Cartellino rosso", value: "-1" },
            { label: "Fallo commesso", value: "-0,10" },
            { label: "Rigore sbagliato", value: "-1" },
            { label: "Autogol", value: "-3" },
            { label: "Errore che porta al gol", value: "-0,10" },
            { label: "Grande occasione sbagliata", value: "-0,10" },
          ]}
        />
      </Section>

      <Section step="05" title="Esempio completo">
        <Paragraph>
          Attaccante: voto base 6, un gol +3, un assist +1, 3 tiri in porta
          +0,30, 2 passaggi chiave +0,20, un&apos;occasione sbagliata
          &minus;0,10, un giallo &minus;0,50.
        </Paragraph>
        <p className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-zinc-200">
          6 + 3 + 1 + 0,30 + 0,20 &minus; 0,10 &minus; 0,50 ={" "}
          <strong className="text-white">9,90 punti</strong>
        </p>
        <Paragraph>
          Da capitano (bonus 20%): 9,90 + 1,98 ={" "}
          <strong className="text-white">11,88 punti</strong>.
        </Paragraph>
      </Section>

      <Callout tone="warning" title="Nota tecnica">
        Il regolamento fissa il bonus capitano al 20% del punteggio, ma alcune
        parti dell&apos;interfaccia mostrano ancora &ldquo;2x&rdquo;. Il
        valore va reso identico tra regolamento, frontend e backend di
        calcolo prima di considerare questo testo definitivo.
      </Callout>
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#22E6C3]/15 text-[11px] font-black text-[#1ED8B7]">
          {step}
        </span>
        <h3 className="text-sm font-black uppercase tracking-wide text-white">
          {title}
        </h3>
      </div>
      <div className="mt-3 space-y-2.5 pl-10">{children}</div>
    </section>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-zinc-400">{children}</p>;
}

function List({
  children,
  numbered = false,
}: {
  children: React.ReactNode;
  numbered?: boolean;
}) {
  const Tag = numbered ? "ol" : "ul";
  return (
    <Tag className={`space-y-2 ${numbered ? "list-decimal pl-4" : ""}`}>
      {children}
    </Tag>
  );
}

function ListItem({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="text-sm leading-6 text-zinc-400">
      <strong className="text-zinc-100">{title}</strong>
      {children ? <span> &mdash; {children}</span> : null}
    </li>
  );
}

function StatTable({
  rows,
  tone,
}: {
  rows: Array<{ label: string; value: string }>;
  tone: "positive" | "negative";
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm ${
            index % 2 === 0 ? "bg-black/20" : "bg-black/10"
          }`}
        >
          <span className="text-zinc-300">{row.label}</span>
          <span
            className={`font-mono font-black ${
              tone === "positive" ? "text-green-400" : "text-red-400"
            }`}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "accent" | "warning";
  title: string;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "accent"
      ? "border-[#22E6C3]/25 bg-[#123A3B]/20 text-[#E9FFFA]"
      : "border-amber-500/20 bg-amber-950/25 text-amber-200";

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-300">{children}</p>
    </div>
  );
}
