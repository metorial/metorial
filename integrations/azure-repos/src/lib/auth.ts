export let toAzureDevOpsAuthHeader = (token: string) => {
  let normalizedToken = token.trim();
  if (normalizedToken.startsWith('Basic ') || normalizedToken.startsWith('Bearer ')) {
    return normalizedToken;
  }

  return normalizedToken.includes('.')
    ? `Bearer ${normalizedToken}`
    : `Basic ${btoa(`:${normalizedToken}`)}`;
};
