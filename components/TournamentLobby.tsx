"use client";

import { useState } from "react";
import { TournamentCard } from "@/components/TournamentCard";
import { CustomDropdown, LeagueLogo } from "@/components/lobby/shared";
import {
  GENERIC_TOURNAMENTS_ERROR,
  TOURNAMENT_GROUP_ORDER,
  getTournamentGroup,
  useLobbyFilters,
  type TournamentGroup,
  type PriceFilter,
  type SortFilter,
  type StatusFilter,
} from "@/components/lobby/LobbyFiltersProvider";

const GROUP_LABEL: Record<TournamentGroup, string> = {
  open: "Aperti",
  live: "In corso",
  closed: "Conclusi",
};

const GROUP_DOT: Record<TournamentGroup, string> = {
  open: "bg-[#22E6C3]",
  live: "bg-[#22E6C3] animate-pulse",
  closed: "bg-zinc-600",
};

const GRID_CLASS =
  "grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3";

const STATUS_OPTIONS: Array<{ label: string; value: StatusFilter }> = [
  { label: "Tutti gli stati", value: "all" },
  { label: "Iscrizioni aperte", value: "enrollments" },
  { label: "In attesa", value: "waiting-for-start" },
  { label: "In corso", value: "in-progress" },
  { label: "Conclusi", value: "finished" },
  { label: "Premi pagati", value: "paid" },
  { label: "Annullati", value: "cancelled" },
];

const PRICE_OPTIONS: Array<{ label: string; value: PriceFilter }> = [
  { label: "Qualsiasi quota", value: "all" },
  { label: "Gratis", value: "free" },
  { label: "Fino a 10 €", value: "low" },
  { label: "Da 10 € a 30 €", value: "mid" },
  { label: "Oltre 30 €", value: "high" },
];

const SORT_OPTIONS: Array<{ label: string; value: SortFilter }> = [
  { label: "Chiusura più vicina", value: "nearest" },
  { label: "Più popolari", value: "popular" },
  { label: "Montepremi più alto", value: "prize" },
];

export function TournamentLobby() {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const {
    searchValue,
    setSearchValue,
    statusFilter,
    setStatusFilter,
    priceFilter,
    setPriceFilter,
    sortFilter,
    setSortFilter,
    showEnrolledOnly,
    setShowEnrolledOnly,
    filterTags,
    selectedTagIds,
    toggleTag,
    clearTags,
    isLoading,
    error,
    visibleTournaments,
    filteredTournaments,
    totalPages,
    safeCurrentPage,
    setCurrentPage,
    resetToFirstPage,
  } = useLobbyFilters();
  // Le sezioni servono solo se i risultati mescolano piu' stati.
  const showSections =
    new Set(filteredTournaments.map(getTournamentGroup)).size > 1;
  const sections = TOURNAMENT_GROUP_ORDER.map((group) => ({
    group,
    items: visibleTournaments.filter(
      (tournament) => getTournamentGroup(tournament) === group,
    ),
  })).filter((section) => section.items.length > 0);
  const activeFilterCount =
    Number(statusFilter !== "all") +
    Number(priceFilter !== "all") +
    Number(sortFilter !== "nearest");

  return (
    <div className="py-4 lg:py-5">
      <div className="relative min-h-[160px] overflow-hidden rounded-2xl border border-white/10 bg-[#0F1E2E] sm:min-h-[190px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- asset sostituito spesso durante lo sviluppo: la cache dell'ottimizzatore next/image intrappolava versioni vecchie */}
        <img
          src="/images/banner-torneo.png"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,17,27,0.92)_0%,rgba(6,17,27,0.55)_45%,rgba(6,17,27,0.15)_100%)]" />

        <div className="relative flex min-h-[160px] flex-col justify-center gap-3 p-4 sm:min-h-[190px] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#22E6C3]">
              Fantashot
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white lg:text-3xl">
              Tornei
            </h1>
            <p className="mt-1 max-w-md text-sm text-zinc-300 lg:text-base">
              Scegli il torneo, crea la tua rosa e sfida gli altri giocatori.
            </p>
          </div>
          <SearchField
            value={searchValue}
            onChange={(value) => {
              setSearchValue(value);
              resetToFirstPage();
            }}
            className="w-full sm:w-auto sm:max-w-[340px] sm:shrink-0"
          />
        </div>
      </div>

      {/* Tag paesi + campionati, multi-selezionabili in OR: un torneo puo'
          coprire piu' campionati insieme, quindi qui non c'e' una gerarchia
          paese->campionato, solo un unico mucchio di tag alla pari. Uguale
          su desktop e mobile. */}
      {filterTags.length ? (
        <div className="scrollbar-hide -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          <FilterTagButton
            label="Tutti"
            isActive={selectedTagIds.length === 0}
            onClick={clearTags}
          />
          {filterTags.map((tag) => (
            <FilterTagButton
              key={tag.id}
              label={tag.label}
              logoUrl={tag.logo}
              isActive={selectedTagIds.includes(tag.id)}
              onClick={() => toggleTag(tag.id)}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-between gap-3 border-b border-white/8 pb-4 lg:mt-7">
        <div>
          <h2 className="text-lg font-bold text-white lg:text-base lg:font-semibold">
            Tornei disponibili
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {filteredTournaments.length}{" "}
            {filteredTournaments.length === 1 ? "risultato" : "risultati"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowEnrolledOnly((current) => !current);
              resetToFirstPage();
            }}
            aria-pressed={showEnrolledOnly}
            className={`flex h-10 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition ${
              showEnrolledOnly
                ? "border-[#1ED8B7]/30 bg-[#22E6C3]/15 text-[#E9FFFA]"
                : "border-white/10 bg-[#0F1E2E]/70 text-zinc-300 hover:border-white/20"
            }`}
          >
            <UserCheckIcon />
            <span className="hidden sm:inline">I miei tornei</span>
            <span className="sm:hidden">Iscritto</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFilterSheetOpen(true)}
            className="relative flex h-10 items-center gap-2 rounded-md border border-white/10 bg-[#0F1E2E]/70 px-3 text-xs font-semibold text-zinc-300 lg:hidden"
          >
            <FilterIcon />
            Filtri
            {activeFilterCount ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#22E6C3] px-1 text-[10px] font-bold text-[#06111B]">
                {activeFilterCount}
              </span>
            ) : null}
          </button>

          <div className="hidden items-center gap-2 lg:flex">
            <LobbySelect
              label="Quota"
              value={priceFilter}
              options={PRICE_OPTIONS}
              onChange={(value) => {
                setPriceFilter(value as PriceFilter);
                resetToFirstPage();
              }}
            />
            <LobbySelect
              label="Stato"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatusFilter(value as StatusFilter);
                resetToFirstPage();
              }}
            />
            <LobbySelect
              label="Ordina"
              value={sortFilter}
              options={SORT_OPTIONS}
              onChange={(value) => {
                setSortFilter(value as SortFilter);
                resetToFirstPage();
              }}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <TournamentLobbySkeleton />
      ) : error ? (
        <div className="mt-5 rounded-xl border border-red-500/20 bg-red-950/35 px-5 py-4 text-sm text-red-200">
          {error === GENERIC_TOURNAMENTS_ERROR
            ? "Impossibile caricare i tornei. Riprova."
            : error}
        </div>
      ) : visibleTournaments.length ? (
        showSections ? (
          <div className="mt-2">
            {sections.map((section) => (
              <section key={section.group} className="mt-5">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  <span className={`h-2 w-2 rounded-full ${GROUP_DOT[section.group]}`} />
                  {GROUP_LABEL[section.group]}
                  <span className="text-zinc-600">{section.items.length}</span>
                </h3>
                <div className={GRID_CLASS}>
                  {section.items.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
<div className={`mt-4 ${GRID_CLASS}`}>
            {visibleTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )
      ) : (
        <div className="mt-5 rounded-xl border border-white/10 bg-[#0F1E2E]/60 px-5 py-12 text-center backdrop-blur-lg">
          <p className="text-base font-semibold text-zinc-200">
            Nessun torneo trovato
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Prova a modificare la ricerca o i filtri selezionati.
          </p>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-2">
          <PaginationButton
            disabled={safeCurrentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <ChevronLeftIcon />
          </PaginationButton>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`grid h-10 min-w-10 place-items-center rounded-lg px-3 text-sm font-semibold transition ${
                  page === safeCurrentPage
                    ? "bg-[#22E6C3]/25 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                }`}
              >
                {page}
              </button>
            )
          )}
          <PaginationButton
            disabled={safeCurrentPage === totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
          >
            <ChevronRightIcon />
          </PaginationButton>
        </div>
      ) : null}

      {isFilterSheetOpen ? (
        <FilterSheet
          statusFilter={statusFilter}
          priceFilter={priceFilter}
          sortFilter={sortFilter}
          onStatusChange={(value) => {
            setStatusFilter(value);
            resetToFirstPage();
          }}
          onPriceChange={(value) => {
            setPriceFilter(value);
            resetToFirstPage();
          }}
          onSortChange={(value) => {
            setSortFilter(value);
            resetToFirstPage();
          }}
          onClose={() => setIsFilterSheetOpen(false)}
        />
      ) : null}
    </div>
  );
}

function SearchField({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`relative block ${className}`}>
      <span className="sr-only">Cerca un torneo</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Cerca torneo o campionato..."
        className="h-11 w-full rounded-full border border-[#243B50] bg-[#101D2C] px-4 pr-11 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#22E6C3]"
      />
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-zinc-400">
        <SearchIcon />
      </span>
    </label>
  );
}

function FilterTagButton({
  label,
  logoUrl,
  isActive,
  onClick,
}: {
  label: string;
  logoUrl?: string | null;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
        isActive
          ? "border-[#22E6C3]/45 bg-[#22E6C3]/20 text-[#E9FFFA]"
          : "border-white/10 bg-[#0F1E2E]/60 text-zinc-400 hover:border-white/20"
      }`}
    >
      <LeagueLogo logoUrl={logoUrl ?? null} label={label} />
      {label}
    </button>
  );
}

function LobbySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <CustomDropdown
      ariaLabel={label}
      buttonClassName="h-10 min-w-[145px] px-3"
      buttonContent={
        <span className="min-w-0 text-left">
          <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
            {label}
          </span>
          <span className="block truncate text-xs text-zinc-200">
            {selected?.label}
          </span>
        </span>
      }
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}

function FilterSheet({
  statusFilter,
  priceFilter,
  sortFilter,
  onStatusChange,
  onPriceChange,
  onSortChange,
  onClose,
}: {
  statusFilter: StatusFilter;
  priceFilter: PriceFilter;
  sortFilter: SortFilter;
  onStatusChange: (value: StatusFilter) => void;
  onPriceChange: (value: PriceFilter) => void;
  onSortChange: (value: SortFilter) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end lg:hidden">
      <button
        type="button"
        aria-label="Chiudi i filtri"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <div className="relative w-full rounded-t-2xl border-t border-white/10 bg-[#0F1E2E] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Filtri</h2>
            <p className="text-xs text-zinc-500">Affina la lista dei tornei</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-zinc-300"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-4">
          <SheetSelect
            label="Stato"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(value) => onStatusChange(value as StatusFilter)}
          />
          <SheetSelect
            label="Quota d'iscrizione"
            value={priceFilter}
            options={PRICE_OPTIONS}
            onChange={(value) => onPriceChange(value as PriceFilter)}
          />
          <SheetSelect
            label="Ordina per"
            value={sortFilter}
            options={SORT_OPTIONS}
            onChange={(value) => onSortChange(value as SortFilter)}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-12 w-full rounded-md bg-gradient-to-r from-[#22E6C3] to-[#18C6A7] text-sm font-bold text-[#06111B]"
        >
          Mostra risultati
        </button>
      </div>
    </div>
  );
}

function SheetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full appearance-none rounded-md border border-white/10 bg-[#101D2C] px-4 text-sm text-zinc-100 outline-none focus:border-[#22E6C3]/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TournamentLobbySkeleton() {
  return (
    <div
      className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex h-[150px] animate-pulse overflow-hidden rounded-lg border border-white/8 bg-[#0F1E2E]/50 lg:h-[280px] lg:flex-col"
        >
          <div className="w-24 bg-white/6 lg:h-[100px] lg:w-full" />
          <div className="flex-1 space-y-3 p-4">
            <div className="h-3 w-2/5 rounded bg-white/6" />
            <div className="h-5 w-4/5 rounded bg-white/8" />
            <div className="h-12 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PaginationButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}
function UserCheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m17 11 2 2 4-4" />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    >
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
