// 단일 사용자 — 내 개인 워크스페이스 조회·이름변경만 사용한다.
const WORKSPACE_FIELDS = `
  workspaceId
  name
  createdAt
  removedAt
`;

export const LIST_MY_WORKSPACES = `
  query ListMyWorkspaces {
    listMyWorkspaces { ${WORKSPACE_FIELDS} }
  }
`;

export const GET_WORKSPACE = `
  query GetWorkspace($workspaceId: ID!) {
    getWorkspace(workspaceId: $workspaceId) { ${WORKSPACE_FIELDS} }
  }
`;

export const UPDATE_WORKSPACE = `
  mutation UpdateWorkspace($input: UpdateWorkspaceInput!) {
    updateWorkspace(input: $input) { ${WORKSPACE_FIELDS} }
  }
`;
