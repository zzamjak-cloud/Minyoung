// 단일 사용자 — 본인 프로필 조회/갱신과 clientPrefs 동기화만 사용한다.
const MEMBER_FIELDS = `
  memberId email name jobRole workspaceRole status jobTitle phone avatarUrl thumbnailUrl personalWorkspaceId cognitoSub createdAt removedAt clientPrefs
  employmentStatus employeeNumber department team jobCategory jobDetail joinedAt rowCount
`;

export const ME = `
  query Me {
    me { ${MEMBER_FIELDS} }
  }
`;

export const UPDATE_MY_CLIENT_PREFS = `
  mutation UpdateMyClientPrefs($input: UpdateMyClientPrefsInput!) {
    updateMyClientPrefs(input: $input) { ${MEMBER_FIELDS} }
  }
`;

export const UPDATE_MEMBER = `
  mutation UpdateMember(
    $memberId: ID!
    $name: String
    $jobRole: String
    $jobTitle: String
    $phone: String
    $avatarUrl: String
    $thumbnailUrl: String
  ) {
    updateMember(
      input: {
        memberId: $memberId
        name: $name
        jobRole: $jobRole
        jobTitle: $jobTitle
        phone: $phone
        avatarUrl: $avatarUrl
        thumbnailUrl: $thumbnailUrl
      }
    ) { ${MEMBER_FIELDS} }
  }
`;
