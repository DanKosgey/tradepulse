/**
 * authUtils.js
 * Modern Deriv OAuth 2.0 PKCE Utilities.
 */

/**
 * Generates a random PKCE code verifier.
 */
export function generateCodeVerifier() {
  const array = crypto.getRandomValues(new Uint8Array(64));
  return Array.from(array)
    .map(v => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[v % 66])
    .join('');
}

/**
 * Generates a PKCE code challenge from a verifier using SHA-256.
 */
export async function generateCodeChallenge(verifier) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Parses Deriv OAuth callback parameters from the URL.
 * Supports:
 * 1. Legacy format: ?token1=...
 * 2. Modern flow: ?code=...&state=...
 */
export function parseDerivOAuthParams(rawParams) {
  const params = new URLSearchParams(rawParams.replace(/^#/, '?'));
  const accounts = [];

  // Legacy format check
  for (let i = 1; i <= 10; i++) {
    const token = params.get(`token${i}`);
    const loginid = params.get(`acct${i}`);
    const currency = params.get(`cur${i}`);
    if (token && loginid) {
      accounts.push({ token, loginid, currency: currency || 'USD' });
    }
  }

  // Modern format check
  const code = params.get('code');
  const state = params.get('state');

  return { accounts, code, state };
}

/**
 * Persists accounts to local storage.
 */
export function saveDerivAccounts(accounts) {
  localStorage.setItem('deriv_accounts', JSON.stringify(accounts));
}
