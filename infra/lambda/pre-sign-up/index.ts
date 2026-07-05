import type { PreSignUpTriggerEvent, PreSignUpTriggerHandler } from "aws-lambda";

const ALLOWED_EMAILS = new Set(["zzamjak@gmail.com", "keanux@naver.com"]);

// 개인용 앱은 가입 가능 이메일을 코드에서 고정한다.
export function isEmailAllowed(email: string): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.has(email.trim().toLowerCase());
}

export const handler: PreSignUpTriggerHandler = async (event: PreSignUpTriggerEvent) => {
  const email = event.request.userAttributes?.email;

  if (!isEmailAllowed(email ?? "")) {
    throw new Error("UNAUTHORIZED_EMAIL");
  }

  if (event.triggerSource === "PreSignUp_ExternalProvider") {
    event.response.autoVerifyEmail = true;
    event.response.autoConfirmUser = true;
  } else {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }
  return event;
};
