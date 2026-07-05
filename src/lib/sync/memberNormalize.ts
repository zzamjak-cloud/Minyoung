// Member GraphQL 응답 정규화 — 단일 사용자(본인 프로필)만 다룬다.

import type { Member } from "../../store/memberStore";

export type GqlMember = Member & {
  cognitoSub?: string | null;
  createdAt?: string;
  removedAt?: string | null;
  clientPrefs?: unknown;
};

function normalizeWorkspaceRole(role: unknown): Member["workspaceRole"] {
  if (typeof role !== "string") return "member";
  const normalized = role.toLowerCase();
  return ["developer", "owner", "leader", "manager", "member"].includes(normalized)
    ? (normalized as NonNullable<Member["workspaceRole"]>)
    : "member";
}

function normalizeStatus(status: unknown): Member["status"] {
  if (typeof status !== "string") return "active";
  const normalized = status.toLowerCase();
  return normalized === "removed" ? "removed" : "active";
}

export function normalizeMemberFields(member: GqlMember | Member): Member {
  return {
    memberId: member.memberId,
    email: member.email,
    name: member.name,
    jobRole: member.jobRole,
    workspaceRole: normalizeWorkspaceRole(member.workspaceRole),
    status: normalizeStatus(member.status),
    jobTitle: member.jobTitle ?? undefined,
    phone: member.phone ?? undefined,
    avatarUrl: member.avatarUrl ?? undefined,
    thumbnailUrl: member.thumbnailUrl ?? undefined,
    personalWorkspaceId: member.personalWorkspaceId,
    employmentStatus: member.employmentStatus ?? undefined,
    employeeNumber: member.employeeNumber ?? undefined,
    department: member.department ?? undefined,
    team: member.team ?? undefined,
    jobCategory: member.jobCategory ?? undefined,
    jobDetail: member.jobDetail ?? undefined,
    joinedAt: member.joinedAt ?? undefined,
    rowCount: member.rowCount ?? undefined,
  };
}
