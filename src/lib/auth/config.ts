// Cognito 이메일/비밀번호 OIDC 설정 (웹 전용).

export type AuthConfig = {
  region: string;
  userPoolId: string;
  hostedUiDomain: string; // ex) minyoung-auth.auth.ap-northeast-2.amazoncognito.com
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  authority: string; // OIDC issuer
  scope: string;
};

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`auth: 필수 환경변수 ${name} 가 비어 있습니다.`);
  }
  return value;
}

export function buildAuthConfig(): AuthConfig {
  const env = import.meta.env;

  const region = required("VITE_COGNITO_REGION", env.VITE_COGNITO_REGION);
  const userPoolId = required(
    "VITE_COGNITO_USER_POOL_ID",
    env.VITE_COGNITO_USER_POOL_ID,
  );
  const hostedUiDomain = required(
    "VITE_COGNITO_HOSTED_UI_DOMAIN",
    env.VITE_COGNITO_HOSTED_UI_DOMAIN,
  );

  const clientId = required(
    "VITE_COGNITO_WEB_CLIENT_ID",
    env.VITE_COGNITO_WEB_CLIENT_ID,
  );

  const redirectUri = required(
    "VITE_AUTH_REDIRECT_WEB",
    env.VITE_AUTH_REDIRECT_WEB,
  );

  return {
    region,
    userPoolId,
    hostedUiDomain,
    clientId,
    redirectUri,
    postLogoutRedirectUri: redirectUri.replace(/\/auth\/callback$/, "/auth/signout"),
    authority: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    scope: "openid email profile",
  };
}
