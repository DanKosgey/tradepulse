export function parseDerivOAuthParams(search) {
  if (!search || typeof search !== 'string') return []
  
  // Handle both ?token1=... and #token1=...
  const cleanSearch = search.startsWith('#') || search.startsWith('?') 
    ? search.substring(1) 
    : search
    
  const params = new URLSearchParams(cleanSearch)
  const accounts = []
  let i = 1
  
  // Deriv sends acct1, token1, cur1... acct2, token2, cur2...
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

export function saveDerivAccounts(accounts) {
  if (!accounts || accounts.length === 0) return
  
  // Store all accounts for the account switcher
  const tokensMap = {}
  accounts.forEach(acc => {
    tokensMap[acc.loginid] = acc.token
  })
  
  localStorage.setItem('deriv_tokens', JSON.stringify(tokensMap))
  localStorage.setItem('deriv_account_list', JSON.stringify(accounts))
  
  // Set the first account as active by default
  localStorage.setItem('deriv_token', accounts[0].token)
  localStorage.setItem('deriv_active_acct', accounts[0].loginid)
}
