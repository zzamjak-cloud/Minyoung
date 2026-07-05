import { create } from "zustand";
import type { Member } from "./memberStore";

export type Organization = {
  organizationId: string;
  name: string;
  leaderMemberIds: string[];
  members: Member[];
  createdAt?: string;
  removedAt?: string;
};

type OrganizationStoreState = {
  organizations: Organization[];
  cacheWorkspaceId: string | null;
  lastFetchedAt: number | null;
};

type OrganizationStoreActions = {
  setOrganizations: (organizations: Organization[], workspaceId?: string | null) => void;
  upsertOrganization: (organization: Organization) => void;
  removeOrganization: (organizationId: string) => void;
  getOrganizationMembers: (organizationId: string) => Member[];
  clear: () => void;
};

export type OrganizationStore = OrganizationStoreState & OrganizationStoreActions;

function normalizeOrganization(organization: Organization): Organization {
  return {
    ...organization,
    leaderMemberIds: organization.leaderMemberIds ?? [],
    members: organization.members ?? [],
  };
}

export const useOrganizationStore = create<OrganizationStore>()((set, get) => ({
  organizations: [],
  cacheWorkspaceId: null,
  lastFetchedAt: null,

  setOrganizations: (organizations, workspaceId) =>
    set((state) => ({
      organizations: organizations.map(normalizeOrganization),
      cacheWorkspaceId: workspaceId ?? state.cacheWorkspaceId,
      lastFetchedAt: Date.now(),
    })),

  upsertOrganization: (organization) =>
    set((state) => {
      const normalized = normalizeOrganization(organization);
      const exists = state.organizations.some(
        (item) => item.organizationId === normalized.organizationId,
      );
      return {
        organizations: exists
          ? state.organizations.map((item) =>
              item.organizationId === normalized.organizationId ? normalized : item,
            )
          : [...state.organizations, normalized],
        lastFetchedAt: Date.now(),
      };
    }),

  removeOrganization: (organizationId) =>
    set((state) => ({
      organizations: state.organizations.filter(
        (organization) => organization.organizationId !== organizationId,
      ),
      lastFetchedAt: Date.now(),
    })),

  getOrganizationMembers: (organizationId) =>
    get().organizations.find(
      (organization) => organization.organizationId === organizationId,
    )?.members ?? [],

  clear: () =>
    set({ organizations: [], cacheWorkspaceId: null, lastFetchedAt: null }),
}));
