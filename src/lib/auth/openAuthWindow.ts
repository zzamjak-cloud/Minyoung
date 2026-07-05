// Hosted UI URL 은 동일 탭 리다이렉트로 연다.
export async function openAuthUrl(url: string): Promise<void> {
  window.location.assign(url);
}
