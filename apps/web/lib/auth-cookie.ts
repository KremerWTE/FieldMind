const COOKIE_NAME = 'fm_auth';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function setAuthCookie() {
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${MAX_AGE}; SameSite=Strict`;
}

export function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Strict`;
}
