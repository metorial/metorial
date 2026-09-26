import { createApiServiceError, createAuthenticatedAxios, requestAxiosData } from 'slates';
import type { OracleFusionAuthOutput } from '../auth';
import { oracleOAuthError } from './errors';
import { requireRecord, stringField } from './records';
import { normalizeHttpsOrigin } from './urls';

export let getOracleIdentityProfile = async (
  auth: Pick<OracleFusionAuthOutput, 'token' | 'identityDomainUrl' | 'instanceUrl'>
) => {
  let identityDomainUrl = normalizeHttpsOrigin(auth.identityDomainUrl, 'Identity domain URL');
  let instanceUrl = normalizeHttpsOrigin(auth.instanceUrl, 'Oracle Fusion instance URL');
  if (typeof auth.token !== 'string' || !/^[\x21-\x7e]+$/.test(auth.token)) {
    throw createApiServiceError(
      'The Oracle Fusion access token is missing or invalid. Reconnect the account.',
      { reason: 'oracle_fusion_missing_auth' }
    );
  }
  let http = createAuthenticatedAxios({
    baseURL: identityDomainUrl,
    authHeader: { value: `Bearer ${auth.token}` },
    contentType: false,
    headers: { Accept: 'application/json' },
    maxRedirects: 0,
    timeout: 30000
  });
  let user = requireRecord(
    await requestAxiosData<unknown>(
      'get authenticated user',
      () => http.get('/oauth2/v1/userinfo'),
      oracleOAuthError
    ),
    'user profile'
  );
  let subject = stringField(user, 'sub');
  if (!subject)
    throw createApiServiceError(
      'Oracle identity domain did not return a stable user subject.',
      { reason: 'oracle_fusion_invalid_profile' }
    );
  let username = stringField(user, 'preferred_username');
  return {
    id: `${identityDomainUrl}#${subject}`,
    subject,
    name: stringField(user, 'name') || username || subject,
    email: stringField(user, 'email'),
    username,
    imageUrl: stringField(user, 'picture') || undefined,
    identityDomainUrl,
    instanceUrl
  };
};
