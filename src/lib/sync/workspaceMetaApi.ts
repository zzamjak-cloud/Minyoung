import { appsyncClient } from "./graphql/client";
import { GET_WORKSPACE_META } from "./queries/workspaceMeta";
import type { Member } from "../../store/memberStore";
import type { Team } from "../../store/teamStore";
import type { Organization } from "../../store/organizationStore";
import {
  type GqlMember,
  normalizeMemberFields,
} from "./memberNormalize";
import {
  GqlMemberSchema,
  GqlOrganizationSchema,
  GqlTeamSchema,
  parseGqlList,
} from "./schemas";

type GqlTeam = Omit<Team, "members"> & {
  members: GqlMember[];
};

type GqlOrganization = Omit<Organization, "members"> & {
  members: GqlMember[];
};

type WorkspaceMetaPayload = {
  members?: unknown;
  teams?: unknown;
  organizations?: unknown;
};

export type WorkspaceMeta = {
  members: Member[];
  teams: Team[];
  organizations: Organization[];
};

function normalizeTeam(team: GqlTeam): Team {
  return {
    ...team,
    leaderMemberIds: team.leaderMemberIds ?? [],
    members: team.members.map(normalizeMemberFields),
  };
}

function normalizeOrganization(organization: GqlOrganization): Organization {
  return {
    ...organization,
    leaderMemberIds: organization.leaderMemberIds ?? [],
    members: organization.members.map(normalizeMemberFields),
  };
}

export async function getWorkspaceMetaApi(workspaceId: string): Promise<WorkspaceMeta> {
  const result = (await appsyncClient().graphql({
    query: GET_WORKSPACE_META,
    variables: { workspaceId },
  })) as { data?: { getWorkspaceMeta?: WorkspaceMetaPayload } };
  const payload = result.data?.getWorkspaceMeta ?? {};
  const members = parseGqlList(
    payload.members ?? [],
    GqlMemberSchema,
    "getWorkspaceMeta.members",
  ).map((member) => normalizeMemberFields(member as unknown as GqlMember));
  const teams = parseGqlList(
    payload.teams ?? [],
    GqlTeamSchema,
    "getWorkspaceMeta.teams",
  ).map((team) => normalizeTeam(team as unknown as GqlTeam));
  const organizations = parseGqlList(
    payload.organizations ?? [],
    GqlOrganizationSchema,
    "getWorkspaceMeta.organizations",
  ).map((organization) => normalizeOrganization(organization as unknown as GqlOrganization));

  return {
    members,
    teams,
    organizations,
  };
}
