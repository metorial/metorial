import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { getPublicCertificate, isRetiredCertificateError } from './lib/certificates';
import { type KsefAuthOutput, KsefClient, type KsefContextType } from './lib/client';
import { encryptRsaOaepSha256 } from './lib/crypto';
import type { KsefEnvironment } from './lib/environments';
import { ksefValidationError } from './lib/errors';

const inputSchema = z.object({
  ksefToken: z
    .string()
    .min(1)
    .describe('Existing KSeF token with the permissions needed for your invoices.'),
  environment: z
    .enum(['TEST', 'DEMO', 'PRODUCTION'])
    .default('TEST')
    .describe('KSeF environment. TEST is intended for synthetic invoices.'),
  contextType: z
    .enum(['Nip', 'InternalId', 'NipVatUe', 'PeppolId'])
    .default('Nip')
    .describe('Type of the taxpayer context identifier.'),
  contextIdentifier: z
    .string()
    .min(1)
    .describe('Taxpayer context identifier, such as the NIP when contextType is Nip.')
});

export type KsefAuthInput = z.input<typeof inputSchema>;

type AuthChallenge = {
  challenge: string;
  timestampMs: number;
};

type TokenInfo = { token: string; validUntil: string };
type AuthInit = { referenceNumber: string; authenticationToken: TokenInfo };
type AuthStatus = {
  status: { code: number; description?: string; details?: string[] };
};
type RedeemedTokens = { accessToken: TokenInfo; refreshToken: TokenInfo };
type RefreshedToken = { accessToken: TokenInfo };

const pollDelay = (durationMs: number) =>
  new Promise<void>(resolve => setTimeout(resolve, durationMs));

function assertTokenInfo(value: unknown, operation: string): asserts value is TokenInfo {
  const info = value as Partial<TokenInfo> | undefined;
  if (
    typeof info?.token !== 'string' ||
    !info.token ||
    typeof info.validUntil !== 'string' ||
    !Number.isFinite(Date.parse(info.validUntil))
  ) {
    throw ksefValidationError(`KSeF returned an invalid ${operation} token response.`);
  }
}

function normalizedInput(input: KsefAuthInput): {
  ksefToken: string;
  environment: KsefEnvironment;
  contextType: KsefContextType;
  contextIdentifier: string;
} {
  const result = inputSchema.safeParse(input);
  if (!result.success) {
    throw ksefValidationError('Provide a KSeF token, environment, and taxpayer context.');
  }
  return {
    ...result.data,
    ksefToken: result.data.ksefToken.trim(),
    contextIdentifier: result.data.contextIdentifier.trim()
  };
}

function authenticationFailed(status: AuthStatus['status']) {
  const details = Array.isArray(status.details) ? status.details.filter(Boolean) : [];
  const description = [status.description, ...details].filter(Boolean).join(' — ');
  return createApiServiceError(
    `KSeF rejected token authentication (status ${status.code})${description ? `: ${description}` : ''}. Check the token, context, and permissions.`,
    { reason: 'ksef_authentication_rejected', upstreamCode: String(status.code) }
  );
}

async function startAuthentication(
  client: KsefClient,
  input: ReturnType<typeof normalizedInput>,
  forceCertificateRefresh: boolean
): Promise<AuthInit> {
  const challenge = await client.request<AuthChallenge>(
    'get authentication challenge',
    'POST',
    '/auth/challenge'
  );
  if (
    typeof challenge?.challenge !== 'string' ||
    !challenge.challenge ||
    !Number.isSafeInteger(challenge.timestampMs)
  ) {
    throw ksefValidationError('KSeF returned an invalid authentication challenge.');
  }

  const certificate = await getPublicCertificate(
    input.environment,
    'KsefTokenEncryption',
    forceCertificateRefresh
  );
  const payload = Buffer.from(`${input.ksefToken}|${challenge.timestampMs}`, 'utf8');
  const encryptedToken = encryptRsaOaepSha256(payload, certificate);
  const initiated = await client.request<AuthInit>(
    'start token authentication',
    'POST',
    '/auth/ksef-token',
    {
      body: {
        challenge: challenge.challenge,
        contextIdentifier: {
          type: input.contextType,
          value: input.contextIdentifier
        },
        encryptedToken,
        publicKeyId: certificate.publicKeyId
      }
    }
  );
  if (typeof initiated?.referenceNumber !== 'string') {
    throw ksefValidationError('KSeF returned no authentication reference.');
  }
  assertTokenInfo(initiated.authenticationToken, 'authentication');
  return initiated;
}

export async function authenticateKsefToken(input: KsefAuthInput): Promise<KsefAuthOutput> {
  const normalized = normalizedInput(input);
  const client = new KsefClient({ token: '', environment: normalized.environment });
  let initiated: AuthInit;
  try {
    initiated = await startAuthentication(client, normalized, false);
  } catch (error) {
    if (!isRetiredCertificateError(error)) throw error;
    initiated = await startAuthentication(client, normalized, true);
  }

  let succeeded = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    const status = await client.request<AuthStatus>(
      'check authentication status',
      'GET',
      `/auth/${encodeURIComponent(initiated.referenceNumber)}`,
      { token: initiated.authenticationToken.token }
    );
    if (status?.status?.code === 200) {
      succeeded = true;
      break;
    }
    if (status?.status?.code !== 100) {
      throw authenticationFailed(status?.status ?? { code: 0 });
    }
    await pollDelay(Math.min(500 + attempt * 250, 2_000));
  }
  if (!succeeded) {
    throw createApiServiceError(
      `KSeF authentication is still pending (reference ${initiated.referenceNumber}). Retry the connection after processing completes.`,
      { reason: 'ksef_authentication_pending' }
    );
  }

  // KSeF allows redemption once. Never retry this write after a timeout.
  const tokens = await client.request<RedeemedTokens>(
    'redeem authentication tokens',
    'POST',
    '/auth/token/redeem',
    { token: initiated.authenticationToken.token }
  );
  assertTokenInfo(tokens?.accessToken, 'access');
  assertTokenInfo(tokens?.refreshToken, 'refresh');
  const output: KsefAuthOutput = {
    token: tokens.accessToken.token,
    expiresAt: tokens.accessToken.validUntil,
    accessTokenValidUntil: tokens.accessToken.validUntil,
    refreshToken: tokens.refreshToken.token,
    refreshTokenValidUntil: tokens.refreshToken.validUntil,
    authenticationReference: initiated.referenceNumber,
    environment: normalized.environment,
    contextType: normalized.contextType,
    contextIdentifier: normalized.contextIdentifier
  };
  await new KsefClient(output).getContextLimits();
  return output;
}

export async function refreshKsefToken(
  output: KsefAuthOutput,
  input: KsefAuthInput
): Promise<KsefAuthOutput> {
  const normalized = normalizedInput(input);
  if (
    output.environment !== normalized.environment ||
    output.contextType !== normalized.contextType ||
    output.contextIdentifier !== normalized.contextIdentifier
  ) {
    return authenticateKsefToken(input);
  }
  const refreshExpiry = Date.parse(output.refreshTokenValidUntil);
  if (
    !output.refreshToken ||
    !Number.isFinite(refreshExpiry) ||
    refreshExpiry <= Date.now() + 60_000
  ) {
    return authenticateKsefToken(input);
  }

  const client = new KsefClient({ token: '', environment: output.environment });
  const refreshed = await client.request<RefreshedToken>(
    'refresh access token',
    'POST',
    '/auth/token/refresh',
    { token: output.refreshToken }
  );
  assertTokenInfo(refreshed?.accessToken, 'refreshed access');
  return {
    ...output,
    token: refreshed.accessToken.token,
    expiresAt: refreshed.accessToken.validUntil,
    accessTokenValidUntil: refreshed.accessToken.validUntil
  };
}

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().min(1),
      expiresAt: z.string(),
      accessTokenValidUntil: z.string(),
      refreshToken: z.string().min(1),
      refreshTokenValidUntil: z.string(),
      authenticationReference: z.string(),
      environment: z.enum(['TEST', 'DEMO', 'PRODUCTION']),
      contextType: z.enum(['Nip', 'InternalId', 'NipVatUe', 'PeppolId']),
      contextIdentifier: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'KSeF Token',
    key: 'ksef_token',
    inputSchema,
    getOutput: async (ctx: { input: KsefAuthInput }) => ({
      output: await authenticateKsefToken(ctx.input)
    }),
    handleTokenRefresh: async (ctx: { output: KsefAuthOutput; input: KsefAuthInput }) => ({
      output: await refreshKsefToken(ctx.output, ctx.input)
    }),
    getProfile: async (ctx: { output: KsefAuthOutput }) => {
      const client = new KsefClient(ctx.output);
      await client.getContextLimits();
      const { environment, contextType, contextIdentifier } = ctx.output;
      return {
        profile: {
          id: `${environment}:${contextType}:${contextIdentifier}`,
          name: `${contextType} ${contextIdentifier}`,
          environment,
          contextType,
          contextIdentifier
        }
      };
    }
  });
