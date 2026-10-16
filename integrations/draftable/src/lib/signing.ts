import crypto from 'node:crypto';
import { createApiServiceError } from 'slates';
import { getBaseUrl, validateIdentifier } from './client';

export let getViewerUrlSignature = (
  accountId: string,
  authToken: string,
  identifier: string,
  validUntil: number
): string => {
  let policy = JSON.stringify({
    account_id: accountId,
    identifier,
    valid_until: validUntil
  });
  return crypto.createHmac('sha256', authToken).update(policy, 'utf8').digest('hex');
};

let viewerBaseUrl = (params: {
  baseUrl: string;
  accountId: string;
  comparisonIdentifier: string;
}) => {
  if (!params.accountId.trim())
    throw createApiServiceError('A Draftable Account ID is required.');
  return `${getBaseUrl(params.baseUrl)}/comparisons/viewer/${encodeURIComponent(params.accountId)}/${encodeURIComponent(validateIdentifier(params.comparisonIdentifier))}`;
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
  let timestamp = Math.floor((Date.now() + minutes * 60 * 1000) / 1000);
  if (
    !Number.isFinite(minutes) ||
    minutes <= 0 ||
    !Number.isFinite(timestamp) ||
    timestamp * 1000 > 8.64e15 ||
    timestamp <= Date.now() / 1000
  ) {
    throw createApiServiceError(
      'validForMinutes must be a positive duration that produces a valid future expiry.'
    );
  }
  if (!params.authToken.trim())
    throw createApiServiceError('A Draftable API token is required.');
  let signature = getViewerUrlSignature(
    params.accountId,
    params.authToken,
    params.comparisonIdentifier,
    timestamp
  );
  let url = `${viewerBaseUrl(params)}?valid_until=${timestamp}&signature=${signature}`;
  if (params.wait) url += '&wait';
  return { viewerUrl: url, validUntil: new Date(timestamp * 1000).toISOString() };
};

export let generatePublicViewerUrl = (params: {
  baseUrl: string;
  accountId: string;
  comparisonIdentifier: string;
  wait?: boolean;
}): string => `${viewerBaseUrl(params)}${params.wait ? '?wait' : ''}`;
