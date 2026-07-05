import { create } from "zustand";
import type { Member } from "./memberStore";

export type Team = {
  teamId: string;
  name: string;
  leaderMemberIds: string[];
  members: Member[];
  createdAt?: string;
  removedAt?: string;
};

type TeamStoreState = {
  teams: Team[];
  cacheWorkspaceId: string | null;
  lastFetchedAt: number | null;
};

type TeamStoreActions = {
  setTeams: (teams: Team[], workspaceId?: string | null) => void;
  upsertTeam: (team: Team) => void;
  removeTeam: (teamId: string) => void;
  getTeamMembers: (teamId: string) => Member[];
  clear: () => void;
};

export type TeamStore = TeamStoreState & TeamStoreActions;

function normalizeTeam(team: Team): Team {
  return {
    ...team,
    leaderMemberIds: team.leaderMemberIds ?? [],
    members: team.members ?? [],
  };
}

export const useTeamStore = create<TeamStore>()((set, get) => ({
  teams: [],
  cacheWorkspaceId: null,
  lastFetchedAt: null,

  setTeams: (teams, workspaceId) =>
    set((state) => ({
      teams: teams.map(normalizeTeam),
      cacheWorkspaceId: workspaceId ?? state.cacheWorkspaceId,
      lastFetchedAt: Date.now(),
    })),

  upsertTeam: (team) =>
    set((state) => {
      const normalized = normalizeTeam(team);
      const exists = state.teams.some((item) => item.teamId === normalized.teamId);
      return {
        teams: exists
          ? state.teams.map((item) =>
              item.teamId === normalized.teamId ? normalized : item,
            )
          : [...state.teams, normalized],
        lastFetchedAt: Date.now(),
      };
    }),

  removeTeam: (teamId) =>
    set((state) => ({
      teams: state.teams.filter((team) => team.teamId !== teamId),
      lastFetchedAt: Date.now(),
    })),

  getTeamMembers: (teamId) =>
    get().teams.find((team) => team.teamId === teamId)?.members ?? [],

  clear: () => set({ teams: [], cacheWorkspaceId: null, lastFetchedAt: null }),
}));
