"use client";

export const GENERIC_TOURNAMENTS_ERROR = "__tournaments_load_error__";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { getAllTournaments } from "@/lib/api/tournaments";
import { getApiDateTimeMs } from "@/lib/date-time";
import type { Tournament, TournamentStatus } from "@/types/tournament";

export type StatusFilter = "all" | TournamentStatus;
export type PriceFilter = "all" | "free" | "low" | "mid" | "high";
export type SortFilter = "nearest" | "popular" | "prize";

/**
 * Niente piu' albero paese->campionato: in Fantashot un torneo copre tante
 * partite/eventi che possono venire da campionati diversi insieme, quindi
 * "un torneo appartiene a un campionato" non e' un modello che regge qui.
 * Al suo posto, un'unica lista di tag (paesi + campionati mescolati) che si
 * selezionano insieme, in OR: un torneo compare se una qualsiasi delle sue
 * leghe soddisfa almeno uno dei tag scelti.
 */
export type FilterTag = {
  id: string;
  label: string;
  logo: string | null;
};

const PAGE_SIZE = 12;

type LobbyFiltersValue = {
  searchValue: string;
  setSearchValue: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  priceFilter: PriceFilter;
  setPriceFilter: (value: PriceFilter) => void;
  sortFilter: SortFilter;
  setSortFilter: (value: SortFilter) => void;
  showEnrolledOnly: boolean;
  setShowEnrolledOnly: (value: boolean | ((current: boolean) => boolean)) => void;
  filterTags: FilterTag[];
  selectedTagIds: string[];
  toggleTag: (tagId: string) => void;
  clearTags: () => void;
  isLoading: boolean;
  error: string | null;
  filteredTournaments: Tournament[];
  visibleTournaments: Tournament[];
  totalPages: number;
  currentPage: number;
  safeCurrentPage: number;
  setCurrentPage: (page: number | ((current: number) => number)) => void;
  resetToFirstPage: () => void;
};

const LobbyFiltersContext = createContext<LobbyFiltersValue | undefined>(
  undefined
);

export function LobbyFiltersProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("nearest");
  const [showEnrolledOnly, setShowEnrolledOnly] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const loadTournaments = useCallback(
    async (isActive: () => boolean, silent = false) => {
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const data = await getAllTournaments(token);

        if (isActive()) {
          setTournaments(data);
          setError(null);
        }
      } catch (requestError) {
        if (isActive() && !silent) {
          setTournaments([]);
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : GENERIC_TOURNAMENTS_ERROR
          );
        }
      } finally {
        if (isActive() && !silent) {
          setIsLoading(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    let isActive = true;

    void Promise.resolve().then(() => loadTournaments(() => isActive));

    return () => {
      isActive = false;
    };
  }, [loadTournaments]);

  const filterTags = useMemo(() => buildFilterTags(tournaments), [tournaments]);

  // Se un tag selezionato sparisce dai dati (torneo rimosso, filtro cambiato
  // a monte), non deve restare "fantasma" a bloccare in silenzio i risultati.
  const effectiveSelectedTagIds = useMemo(() => {
    const availableIds = new Set(filterTags.map((tag) => tag.id));
    return selectedTagIds.filter((id) => availableIds.has(id));
  }, [filterTags, selectedTagIds]);

  const toggleTag = useCallback(
    (tagId: string) => {
      setSelectedTagIds((current) =>
        current.includes(tagId)
          ? current.filter((id) => id !== tagId)
          : [...current, tagId]
      );
      resetToFirstPage();
    },
    [resetToFirstPage]
  );

  const clearTags = useCallback(() => {
    setSelectedTagIds([]);
    resetToFirstPage();
  }, [resetToFirstPage]);

  const filteredTournaments = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const selectedLeagueIds = new Set(
      effectiveSelectedTagIds
        .filter((id) => id.startsWith("league:"))
        .map((id) => id.slice("league:".length))
    );

    const items = tournaments.filter((tournament) => {
      if (showEnrolledOnly && !tournament.is_user_registered) {
        return false;
      }

      if (selectedLeagueIds.size) {
        const matchesAnyTag = tournament.leagues.some((league) =>
          selectedLeagueIds.has(String(league.id))
        );

        if (!matchesAnyTag) {
          return false;
        }
      }

      if (statusFilter !== "all" && tournament.status !== statusFilter) {
        return false;
      }

      if (!matchesPriceFilter(tournament, priceFilter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        tournament.title,
        ...tournament.leagues.map((league) => league.name),
        ...tournament.leagues.flatMap((league) =>
          league.country ? [league.country.name] : []
        ),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });

    return sortTournaments(items, sortFilter);
  }, [
    tournaments,
    showEnrolledOnly,
    effectiveSelectedTagIds,
    statusFilter,
    priceFilter,
    searchValue,
    sortFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTournaments.length / PAGE_SIZE)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleTournaments = filteredTournaments.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const value: LobbyFiltersValue = {
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
    selectedTagIds: effectiveSelectedTagIds,
    toggleTag,
    clearTags,
    isLoading,
    error,
    filteredTournaments,
    visibleTournaments,
    totalPages,
    currentPage,
    safeCurrentPage,
    setCurrentPage,
    resetToFirstPage,
  };

  return (
    <LobbyFiltersContext.Provider value={value}>
      {children}
    </LobbyFiltersContext.Provider>
  );
}

export function useLobbyFilters() {
  const context = useContext(LobbyFiltersContext);

  if (!context) {
    throw new Error("useLobbyFilters must be used inside LobbyFiltersProvider");
  }

  return context;
}

/**
 * Solo campionati: ogni campionato appartiene gia' a un paese, un tag paese
 * separato sarebbe ridondante (l'utente filtrerebbe due volte la stessa cosa).
 */
function buildFilterTags(tournaments: Tournament[]): FilterTag[] {
  const leagues = new Map<number, FilterTag>();

  tournaments.forEach((tournament) => {
    tournament.leagues.forEach((league) => {
      if (!leagues.has(league.id)) {
        leagues.set(league.id, {
          id: `league:${league.id}`,
          label: league.name,
          logo: league.logo,
        });
      }
    });
  });

  return Array.from(leagues.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "it")
  );
}

function matchesPriceFilter(tournament: Tournament, filter: PriceFilter) {
  const amount = tournament.buy_in.amount;

  if (filter === "all") return true;
  if (filter === "free") return amount === 0;
  if (filter === "low") return amount > 0 && amount < 1000;
  if (filter === "mid") return amount >= 1000 && amount < 3000;
  return amount >= 3000;
}

export type TournamentGroup = "open" | "live" | "closed";

export const TOURNAMENT_GROUP_ORDER: TournamentGroup[] = ["open", "live", "closed"];

export function getTournamentGroup(tournament: Tournament): TournamentGroup {
  if (tournament.status === "in-progress") return "live";
  if (["finished", "paid", "cancelled"].includes(tournament.status)) return "closed";
  return "open";
}

/** Prima gli aperti, poi i live, poi i conclusi; dentro ogni gruppo vale l'ordinamento scelto. */
function sortTournaments(tournaments: Tournament[], sort: SortFilter) {
  const rank = (tournament: Tournament) =>
    TOURNAMENT_GROUP_ORDER.indexOf(getTournamentGroup(tournament));

  return sortByChoice(tournaments, sort).sort((a, b) => rank(a) - rank(b));
}

function sortByChoice(tournaments: Tournament[], sort: SortFilter) {
  const sorted = [...tournaments];

  if (sort === "prize") {
    return sorted.sort((a, b) => b.prize_pool.amount - a.prize_pool.amount);
  }

  if (sort === "popular") {
    return sorted.sort(
      (a, b) => b.enrolled_users_count - a.enrolled_users_count
    );
  }

  return sorted.sort(
    (a, b) =>
      getApiDateTimeMs(a.enrollments_end_date) -
      getApiDateTimeMs(b.enrollments_end_date)
  );
}
