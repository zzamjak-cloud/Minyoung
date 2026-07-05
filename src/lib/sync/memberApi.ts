import { appsyncClient } from "./graphql/client";
import { ME, UPDATE_MEMBER } from "./queries/member";
import { useMemberStore, type Member, type MemberMini } from "../../store/memberStore";
import {
  type GqlMember,
  normalizeMemberFields,
} from "./memberNormalize";

// 단일 사용자 — 본인 프로필 조회/갱신만 남긴다.
type UpdateMemberInput = {
  name?: string | null;
  jobRole?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  thumbnailUrl?: string | null;
};

type GqlMePayload = GqlMember;

/** 인증 초기 로드 및 prefs 동기화에 사용한다. clientPrefs 로컬 적용 후 member 만 스토어에 넣으면 된다. */
export type MeWithPrefs = {
  member: Member;
  clientPrefs: unknown;
};

export async function fetchMeWithClientPrefs(): Promise<MeWithPrefs> {
  const result = (await appsyncClient().graphql({
    query: ME,
  })) as { data?: { me?: GqlMePayload } };
  const me = result.data?.me;
  if (!me) throw new Error("me 응답이 비어 있습니다.");
  const rawPrefs = me.clientPrefs;
  const member = normalizeMemberFields(me);
  return { member, clientPrefs: rawPrefs ?? null };
}

export async function meApi(): Promise<Member> {
  const { member } = await fetchMeWithClientPrefs();
  return member;
}

export async function updateMemberApi(memberId: string, input: UpdateMemberInput): Promise<Member> {
  const result = (await appsyncClient().graphql({
    query: UPDATE_MEMBER,
    variables: { memberId, ...input },
  })) as { data?: { updateMember?: GqlMember } };
  const member = result.data?.updateMember;
  if (!member) throw new Error("updateMember 응답이 비어 있습니다.");
  return normalizeMemberFields(member);
}

export async function searchMembersForMentionApi(
  query: string,
  limit = 8,
): Promise<MemberMini[]> {
  const q = query.trim().toLowerCase();
  return useMemberStore
    .getState()
    .members
    .filter((member) => (member.status ?? "active") === "active")
    .filter((member) => {
      if (!q) return true;
      return (
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q)
      );
    })
    .slice(0, limit)
    .map((member) => ({
      memberId: member.memberId,
      name: member.name,
      jobRole: member.jobRole,
    }));
}
