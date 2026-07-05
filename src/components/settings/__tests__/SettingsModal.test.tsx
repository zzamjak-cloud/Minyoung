import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { SettingsModal } from "../SettingsModal";
import { useMemberStore } from "../../../store/memberStore";

describe("SettingsModal (개인용 단일 화면)", () => {
  beforeEach(() => {
    useMemberStore.setState({
      me: null,
      members: [],
      mentionCandidates: [],
      mentionQuery: "",
    });
  });

  it("프로필/화면 설정/로그아웃만 보인다", () => {
    useMemberStore.setState({
      me: {
        memberId: "m1",
        email: "m1@x.com",
        name: "User",
        jobRole: "Engineer",
        workspaceRole: "member",
        status: "active",
        personalWorkspaceId: "ws-1",
      },
    });

    render(<SettingsModal open onClose={() => {}} />);
    expect(screen.getAllByText("내 프로필").length).toBeGreaterThan(0);
    expect(screen.getByText("로그아웃")).toBeTruthy();
    expect(screen.getByText("m1@x.com")).toBeTruthy();
  });

  it("owner 권한이어도 관리 탭이 노출되지 않는다", () => {
    useMemberStore.setState({
      me: {
        memberId: "m2",
        email: "m2@x.com",
        name: "Owner",
        jobRole: "Lead",
        workspaceRole: "owner",
        status: "active",
        personalWorkspaceId: "ws-2",
      },
    });

    render(<SettingsModal open onClose={() => {}} />);
    expect(screen.queryByText("구성원")).toBeNull();
    expect(screen.queryByText("팀 관리")).toBeNull();
    expect(screen.queryByText("조직 관리")).toBeNull();
    expect(screen.queryByText("워크스페이스 관리")).toBeNull();
    expect(screen.queryByText("자산")).toBeNull();
    expect(screen.queryByText("가져오기", { exact: false })).toBeNull();
  });
});
