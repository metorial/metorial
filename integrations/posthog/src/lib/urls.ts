export let getPrivateBaseUrl = (region: string, instanceUrl?: string): string => {
  if (region === 'self-hosted' && instanceUrl) {
    return instanceUrl.replace(/\/+$/, '');
  }
  if (region === 'eu') return 'https://eu.posthog.com';
  return 'https://us.posthog.com';
};

export let getPublicBaseUrl = (region: string, instanceUrl?: string): string => {
  if (region === 'self-hosted' && instanceUrl) {
    return instanceUrl.replace(/\/+$/, '');
  }
  if (region === 'eu') return 'https://eu.i.posthog.com';
  return 'https://us.i.posthog.com';
};
