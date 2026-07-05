import { CACHE_TTL, isCacheFresh } from "../cache/ttl";
import { useMemberStore } from "../../store/memberStore";
import { useOrganizationStore } from "../../store/organizationStore";
import { useTeamStore } from "../../store/teamStore";
import { getWorkspaceMetaApi } from "./workspaceMetaApi";

export function isWorkspaceMetaCacheFresh(workspaceId: string): boolean {
  const members = useMemberStore.getState();
  const teams = useTeamStore.getState();
  const organizations = useOrganizationStore.getState();
  return (
    members.cacheWorkspaceId === workspaceId &&
    teams.cacheWorkspaceId === workspaceId &&
    organizations.cacheWorkspaceId === workspaceId &&
    isCacheFresh(members.lastFetchedAt, CACHE_TTL.WORKSPACE_META) &&
    isCacheFresh(teams.lastFetchedAt, CACHE_TTL.WORKSPACE_META) &&
    isCacheFresh(organizations.lastFetchedAt, CACHE_TTL.WORKSPACE_META)
  );
}

export async function refreshWorkspaceMeta(
  workspaceId: string,
  options: { force?: boolean } = {},
): Promise<boolean> {
  if (!options.force && isWorkspaceMetaCacheFresh(workspaceId)) return false;
  const meta = await getWorkspaceMetaApi(workspaceId);
  useMemberStore.getState().setMembers(meta.members, workspaceId);
  useTeamStore.getState().setTeams(meta.teams, workspaceId);
  useOrganizationStore.getState().setOrganizations(meta.organizations, workspaceId);
  return true;
}
