import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "../lib/storage/index";

export type MemberRole = "developer" | "owner" | "leader" | "manager" | "member";
export type MemberStatus = "active" | "removed";
export type EmploymentStatus = "재직중" | "휴직" | "병가" | "퇴사";

// 단일 사용자 전용 — 멤버는 본인 1명뿐이다.
// 프로필 표시·lastEditedBy·멘션 표기를 위해 `me` 와, 기존 소비처 호환을 위한
// 멤버 목록 메서드를 얇게 유지한다.
export type Member = {
  memberId: string;
  email: string;
  name: string;
  jobRole: string;
  workspaceRole?: MemberRole;
  status?: MemberStatus;
  jobTitle?: string;
  phone?: string;
  avatarUrl?: string;
  thumbnailUrl?: string;
  personalWorkspaceId: string;
  employmentStatus?: EmploymentStatus;
  employeeNumber?: string;
  department?: string;
  team?: string;
  jobCategory?: string;
  jobDetail?: string;
  joinedAt?: string;
  rowCount?: number;
};

export type MemberMini = {
  memberId: string;
  name: string;
  jobRole: string;
};

type MemberStoreState = {
  me: Member | null;
  /** 호환용 목록 — 단일 사용자 화면에서는 보통 me 1명만 들어간다. */
  members: Member[];
  cacheWorkspaceId: string | null;
  lastFetchedAt: number | null;
  mentionCandidates: MemberMini[];
  mentionQuery: string;
};

type MemberStoreActions = {
  setMe: (member: Member | null) => void;
  setMembers: (members: Member[], workspaceId?: string | null) => void;
  upsertMember: (member: Member) => void;
  removeMemberFromCache: (memberId: string) => void;
  setMentionCandidates: (query: string, candidates: MemberMini[]) => void;
  clearMentions: () => void;
  clear: () => void;
};

export type MemberStore = MemberStoreState & MemberStoreActions;

export const useMemberStore = create<MemberStore>()(
  persist(
    (set) => ({
      me: null,
      members: [],
      cacheWorkspaceId: null,
      lastFetchedAt: null,
      mentionCandidates: [],
      mentionQuery: "",

      setMe: (member) =>
        set({
          me: member,
          members: member ? [member] : [],
        }),

      setMembers: (members, workspaceId) =>
        set((state) => ({
          members,
          me: state.me ?? members[0] ?? null,
          cacheWorkspaceId: workspaceId ?? state.cacheWorkspaceId,
          lastFetchedAt: Date.now(),
        })),

      upsertMember: (member) =>
        set((state) => {
          const exists = state.members.some((m) => m.memberId === member.memberId);
          return {
            members: exists
              ? state.members.map((m) => (m.memberId === member.memberId ? member : m))
              : [...state.members, member],
            me:
              state.me?.memberId === member.memberId
                ? member
                : state.me,
            lastFetchedAt: Date.now(),
          };
        }),

      removeMemberFromCache: (memberId) =>
        set((state) => ({
          members: state.members.filter((m) => m.memberId !== memberId),
          me: state.me?.memberId === memberId ? null : state.me,
          mentionCandidates: state.mentionCandidates.filter((m) => m.memberId !== memberId),
          lastFetchedAt: Date.now(),
        })),

      setMentionCandidates: (query, candidates) =>
        set({
          mentionQuery: query,
          mentionCandidates: candidates,
        }),

      clearMentions: () =>
        set({
          mentionQuery: "",
          mentionCandidates: [],
        }),

      clear: () =>
        set({
          me: null,
          members: [],
          cacheWorkspaceId: null,
          lastFetchedAt: null,
          mentionCandidates: [],
          mentionQuery: "",
        }),
    }),
    {
      name: "minyoung.members.cache.v1",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        me: state.me,
        members: state.members,
        cacheWorkspaceId: state.cacheWorkspaceId,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);
