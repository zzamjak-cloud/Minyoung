import { beforeEach, describe, expect, it } from "vitest";
import { useNotificationStore } from "../notificationStore";

describe("notificationStore", () => {
  beforeEach(() => {
    useNotificationStore.setState({ items: [] });
  });

  it("멘션 멤버 id 의 m: prefix 를 제거해서 내 알림으로 조회한다", () => {
    useNotificationStore.getState().addNotification({
      recipientMemberId: "m:me",
      kind: "mention",
      source: "page",
      pageTitle: "테스트",
      pageId: "p1",
      blockId: "b1",
      fromMemberId: "author",
      commentId: "page:p1:block:b1:member:me",
      previewBody: "확인 부탁드립니다",
    });

    const state = useNotificationStore.getState();
    expect(state.listForMember("me")).toHaveLength(1);
    expect(state.unreadCountForMember("me")).toBe(1);
    expect(state.items[0]?.recipientMemberId).toBe("me");
  });

  it("같은 대상·같은 키의 멘션 알림은 중복 생성하지 않는다", () => {
    const input = {
      recipientMemberId: "m:me",
      kind: "mention" as const,
      source: "page" as const,
      pageTitle: "테스트",
      pageId: "p1",
      blockId: "b1",
      fromMemberId: "author",
      commentId: "page:p1:block:b1:member:me",
      previewBody: "초안",
    };
    useNotificationStore.getState().addNotification(input);
    useNotificationStore.getState().addNotification(input);

    expect(useNotificationStore.getState().items).toHaveLength(1);
  });

  it("updateNotificationByCommentId 로 기존 알림 내용을 갱신한다", () => {
    useNotificationStore.getState().addNotification({
      recipientMemberId: "me",
      kind: "mention",
      source: "page",
      pageTitle: "테스트",
      pageId: "p1",
      blockId: "b1",
      fromMemberId: "author",
      commentId: "page:p1:block:b1:member:me",
      previewBody: "초안",
    });

    useNotificationStore
      .getState()
      .updateNotificationByCommentId("page:p1:block:b1:member:me", {
        previewBody: "수정 후 본문",
      });

    expect(useNotificationStore.getState().items[0]?.previewBody).toBe(
      "수정 후 본문",
    );
  });
});
