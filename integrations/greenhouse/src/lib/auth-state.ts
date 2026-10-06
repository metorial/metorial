import { Buffer } from 'node:buffer';
import { createAxios, normalizeOAuthTokenResponse } from 'slates';
import { z } from 'zod';
import {
  errorFor,
  fail,
  id,
  opaque,
  parsed,
  privateResponse,
  retiredAuth,
  timestamp
} from './helpers';

export const authSchema = z.object({
  token: z.string(),
  apiVersion: z.literal('harvest_v3').optional(),
  mode: z.enum(['custom', 'partner']).optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  userId: z.string().optional(),
  subjectId: z.string().optional(),
  organizationId: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional()
});
export type AuthState = z.infer<typeof authSchema>;
export const currentAuth = (auth: AuthState) => {
  if (
    auth.apiVersion !== 'harvest_v3' ||
    !auth.mode ||
    !auth.clientId ||
    !auth.clientSecret ||
    !auth.organizationId
  )
    return retiredAuth();
  opaque(auth.token, 'Access token');
  opaque(auth.clientId, 'Client ID');
  opaque(auth.clientSecret, 'Client secret');
  id(auth.organizationId, 'Organization ID');
  return auth as AuthState & {
    clientId: string;
    clientSecret: string;
    organizationId: string;
    mode: 'custom' | 'partner';
  };
};
const basic = (clientId: string, clientSecret: string) => {
  opaque(clientId, 'Client ID');
  opaque(clientSecret, 'Client secret');
  if (clientId.includes(':'))
    fail(
      'Client ID cannot contain a colon in HTTP Basic authentication. Use the exact client ID supplied by Greenhouse.'
    );
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`;
};
const tokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().int().positive().safe().optional(),
  expires_at: z.string().optional()
});
const introspectionSchema = z.object({
  active: z.boolean(),
  client_id: z.string().optional(),
  sub: z.string().optional(),
  scope: z.string().optional(),
  'https://auth.greenhouse.io/claims': z
    .object({
      organization: z.object({
        id: z.number().int().safe().positive(),
        name: z.string().optional()
      }),
      user_role: z.string().nullable().optional()
    })
    .optional()
});
export const introspect = async (auth: {
  token: string;
  clientId: string;
  clientSecret: string;
  organizationId?: string;
  userId?: string;
  subjectId?: string;
}) => {
  let data: unknown;
  try {
    const response = await createAxios({
      baseURL: 'https://auth.greenhouse.io',
      timeout: 30000,
      maxRedirects: 0,
      headers: {
        Authorization: basic(auth.clientId, auth.clientSecret),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }).post(
      '/introspect',
      new URLSearchParams({
        token: opaque(auth.token, 'Access token'),
        token_type_hint: 'access_token'
      }).toString()
    );
    data = response.data;
  } catch (error) {
    throw errorFor(error, 'introspect');
  }
  privateResponse(data, auth);
  const result = parsed(introspectionSchema, data);
  const organization = result['https://auth.greenhouse.io/claims']?.organization;
  if (!result.active || result.client_id !== auth.clientId || !organization)
    fail(
      'The token is inactive or its client and organization could not be verified. Reconnect with Harvest v3 credentials.',
      'invalid_authentication'
    );
  if (auth.organizationId !== undefined && String(organization.id) !== auth.organizationId)
    fail(
      'The authenticated organization changed. Reconnect and select the intended Greenhouse account.',
      'invalid_authentication'
    );
  if (auth.userId !== undefined && result.sub !== auth.userId)
    fail(
      'Greenhouse did not confirm the requested acting user. Reconnect using the intended user or integration service user.',
      'invalid_authentication'
    );
  if (auth.subjectId !== undefined && result.sub !== auth.subjectId)
    fail(
      'The authenticated token subject changed. Reconnect using the intended user or integration service user.',
      'invalid_authentication'
    );
  return {
    active: true,
    clientId: result.client_id,
    subjectId: result.sub,
    organizationId: String(organization.id),
    organizationName: organization.name,
    userRole: result['https://auth.greenhouse.io/claims']?.user_role,
    scopes: result.scope === undefined ? undefined : result.scope.split(/\s+/).filter(Boolean)
  };
};
export const exchange = async (options: {
  mode: 'custom' | 'partner';
  clientId: string;
  clientSecret: string;
  userId?: string;
  code?: string;
  refreshToken?: string;
  organizationId?: string;
  expectedSubjectId?: string;
}): Promise<AuthState> => {
  if (options.userId !== undefined) id(options.userId, 'Acting user ID');
  const params =
    options.mode === 'custom'
      ? undefined
      : options.code !== undefined
        ? {
            grant_type: 'authorization_code',
            code: opaque(options.code, 'Authorization code')
          }
        : {
            grant_type: 'refresh_token',
            refresh_token: opaque(options.refreshToken, 'Refresh token')
          };
  const body =
    options.mode === 'custom'
      ? new URLSearchParams({
          grant_type: 'client_credentials',
          ...(options.userId === undefined ? {} : { sub: options.userId })
        }).toString()
      : '';
  let data: unknown;
  try {
    data = (
      await createAxios({
        baseURL: 'https://auth.greenhouse.io',
        timeout: 30000,
        maxRedirects: 0,
        headers: {
          Authorization: basic(options.clientId, options.clientSecret),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }).post('/token', body, { params })
    ).data;
  } catch (error) {
    throw errorFor(error, 'token exchange');
  }
  const result = parsed(tokenSchema, data);
  if (result.token_type.toLowerCase() !== 'bearer')
    fail(
      'Greenhouse returned an unsupported token type. Reconnect.',
      'invalid_authentication'
    );
  opaque(result.access_token, 'Returned access token');
  const normalized = normalizeOAuthTokenResponse(result, {
    previousRefreshToken: options.refreshToken
  });
  const expiresAt =
    result.expires_at === undefined
      ? normalized.expiresAt
      : timestamp(result.expires_at, 'Token expiry');
  if (!expiresAt || Date.parse(expiresAt) <= Date.now())
    fail(
      'Greenhouse did not return a future token expiry. Reconnect.',
      'invalid_authentication'
    );
  const refreshToken = normalized.refreshToken;
  if (options.mode === 'partner') opaque(refreshToken, 'Returned refresh token');
  const identity = await introspect({
    token: result.access_token,
    ...options,
    subjectId: options.expectedSubjectId
  });
  return {
    token: result.access_token,
    apiVersion: 'harvest_v3',
    mode: options.mode,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    userId: options.userId,
    subjectId: identity.subjectId,
    organizationId: identity.organizationId,
    scopes: identity.scopes,
    refreshToken,
    expiresAt
  };
};
export const profile = async (output: AuthState) => {
  const identity = await introspect(currentAuth(output));
  return {
    profile: {
      id: identity.organizationId,
      name: identity.organizationName,
      organizationId: identity.organizationId,
      subjectId: identity.subjectId
    }
  };
};
export const SCOPES = [
  'harvest:candidates:list',
  'harvest:candidates:create',
  'harvest:candidates:update',
  'harvest:applications:list',
  'harvest:applications:move',
  'harvest:applications:reject',
  'harvest:jobs:list',
  'harvest:jobs:create',
  'harvest:job_interview_stages:list',
  'harvest:offers:list',
  'harvest:users:list',
  'harvest:departments:list',
  'harvest:offices:list',
  'harvest:interviews:list',
  'harvest:notes:create',
  'harvest:candidate_tags:list',
  'harvest:applied_candidate_tags:list',
  'harvest:applied_candidate_tags:create',
  'harvest:applied_candidate_tags:destroy',
  'harvest:rejection_reasons:list',
  'harvest:attachments:list'
] as const;
