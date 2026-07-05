import { beforeEach, describe, expect, it, vi } from "vitest";
import { startSubscriptions } from "../subscribers";

const mocks = vi.hoisted(() => ({
  graphql: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  scheduleFlush: vi.fn(),
}));

vi.mock("../graphql/client", () => ({
  appsyncClient: () => ({ graphql: mocks.graphql }),
}));

vi.mock("../../auth/apiTokens", () => ({
  ensureFreshTokensForAppSync: vi.fn(async () => ({
    idToken: "id-token",
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  })),
}));

vi.mock("../runtime", () => ({
  getSyncEngine: vi.fn(async () => ({ scheduleFlush: mocks.scheduleFlush })),
}));

describe("startSubscriptions", () => {
  beforeEach(() => {
    mocks.graphql.mockReset();
    mocks.subscribe.mockReset();
    mocks.unsubscribe.mockReset();
    mocks.scheduleFlush.mockReset();
    mocks.subscribe.mockReturnValue({ unsubscribe: mocks.unsubscribe });
    mocks.graphql.mockReturnValue({ subscribe: mocks.subscribe });
  });

  it("AppSync subscription WebSocket handshake에 Authorization header를 전달한다", async () => {
    const stop = startSubscriptions("ws-1", {
      onPage: vi.fn(),
      onDatabase: vi.fn(),
    });

    await vi.waitFor(() => expect(mocks.graphql).toHaveBeenCalledTimes(2));

    for (const [args, additionalHeaders] of mocks.graphql.mock.calls) {
      expect(args).toMatchObject({
        variables: { workspaceId: "ws-1" },
        authMode: "none",
      });
      expect(args).not.toHaveProperty("authToken");
      expect(additionalHeaders).toEqual({ Authorization: "id-token" });
    }

    stop();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it("meta-only page subscription payload를 onPage로 전달한다", async () => {
    const onPage = vi.fn();
    const stop = startSubscriptions("ws-1", {
      onPage,
      onDatabase: vi.fn(),
    });

    await vi.waitFor(() => expect(mocks.subscribe).toHaveBeenCalled());

    const pageSubscriber = mocks.subscribe.mock.calls[0]?.[0];
    pageSubscriber.next({
      data: {
        onPageChanged: {
          id: "page-1",
          workspaceId: "ws-1",
          createdByMemberId: "member-1",
          title: "Moved",
          titleColor: null,
          icon: "📄",
          coverImage: null,
          parentId: null,
          order: "2",
          databaseId: null,
          fullPageDatabaseId: null,
          lastEditedByMemberId: null,
          lastEditedByName: null,
          createdAt: "2026-06-15T00:00:00.000Z",
          updatedAt: "2026-06-15T00:00:01.000Z",
          deletedAt: null,
        },
      },
    });

    expect(onPage).toHaveBeenCalledWith(expect.objectContaining({
      id: "page-1",
      order: "2",
      title: "Moved",
    }));

    stop();
  });

  it("page 이벤트 처리 중 예외가 나도 다음 이벤트를 계속 처리한다", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const onPage = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("apply failed");
      });
    const stop = startSubscriptions("ws-1", {
      onPage,
      onDatabase: vi.fn(),
    });

    await vi.waitFor(() => expect(mocks.subscribe).toHaveBeenCalled());

    const pageSubscriber = mocks.subscribe.mock.calls[0]?.[0];
    const payload = {
      id: "page-1",
      workspaceId: "ws-1",
      createdByMemberId: "member-1",
      title: "Moved",
      titleColor: null,
      icon: "📄",
      coverImage: null,
      parentId: null,
      order: "2",
      databaseId: null,
      fullPageDatabaseId: null,
      lastEditedByMemberId: null,
      lastEditedByName: null,
      createdAt: "2026-06-15T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:01.000Z",
      deletedAt: null,
    };

    expect(() => {
      pageSubscriber.next({ data: { onPageChanged: payload } });
      pageSubscriber.next({
        data: {
          onPageChanged: {
            ...payload,
            order: "3",
            updatedAt: "2026-06-15T00:00:02.000Z",
          },
        },
      });
    }).not.toThrow();

    expect(onPage).toHaveBeenCalledTimes(2);
    expect(onPage).toHaveBeenLastCalledWith(expect.objectContaining({
      id: "page-1",
      order: "3",
    }));

    consoleError.mockRestore();
    stop();
  });
});
