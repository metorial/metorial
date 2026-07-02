import crypto from 'crypto';

export let getViewerUrlSignature = (
  accountId: string,
  authToken: string,
  identifier: string,
  validUntil: string
): string => {
  let policy = JSON.stringify({
    account_id: accountId,
    identifier: identifier,
    valid_until: validUntil
  });
  let hmac = crypto.createHmac('sha256', authToken);
  hmac.update(policy, 'utf8');
  return hmac.digest('hex');
};

export let generateSignedViewerUrl = (params: {
  baseUrl: string;
  accountId: string;
  authToken: string;
  comparisonIdentifier: string;
  validUntilMinutes?: number;
  wait?: boolean;
}): { viewerUrl: string; validUntil: string } => {
  let minutes = params.validUntilMinutes ?? 30;
  let validUntilDate = new Date(Date.now() + minutes * 60 * 1000);
  let validUntil = validUntilDate.toISOString().replace('Z', '+00:00');

  let signature = getViewerUrlSignature(
    params.accountId,
    params.authToken,
    params.comparisonIdentifier,
    validUntil
  );

  let url = `${params.baseUrl}/comparisons/viewer/${params.accountId}/${params.comparisonIdentifier}?valid_until=${encodeURIComponent(validUntil)}&signature=${signature}`;

  if (params.wait) {
    url += '&wait';
  }

  return { viewerUrl: url, validUntil: validUntilDate.toISOString() };
};

export let generatePublicViewerUrl = (params: {
  baseUrl: string;
  accountId: string;
  comparisonIdentifier: string;
  wait?: boolean;
}): string => {
  let url = `${params.baseUrl}/comparisons/viewer/${params.accountId}/${params.comparisonIdentifier}`;
  if (params.wait) {
    url += '?wait';
  }
  return url;
};
