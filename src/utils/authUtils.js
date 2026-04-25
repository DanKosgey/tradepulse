export function parseDerivOAuthHash(hash) {
  if (!hash || typeof hash !== 'string') return []
  
  // Remove leading '#' if present
  const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash
  const params = new URLSearchParams(cleanHash)
  
  const accounts = []
  let i = 1
  
  // Parse acct1, token1, cur1, etc.
  while (params.has(`acct${i}`) && params.has(`token${i}`)) {
    accounts.push({
      loginid: params.get(`acct${i}`),
      token: params.get(`token${i}`),
      currency: params.get(`cur${i}`) || 'USD',
    })
    i++
  }
  
  return accounts
}
