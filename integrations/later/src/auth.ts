import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { invalid, laterError } from './lib/errors';

export interface AuthState {
  token: string;
  apiVersion?: 'v1' | 'v2';
  expiresAt?: string;
}
const inputSchema = z.object({
  clientId: z
    .string()
    .describe(
      'Client ID issued by your Later Account Manager for the selected Reporting API version.'
    ),
  clientSecret: z
    .string()
    .describe('Confidential client secret issued by your Later Account Manager.')
});
const clients = {
  v1: createAxios({ baseURL: 'https://api.mavrck.co', timeout: 30000, maxRedirects: 0 }),
  v2: createAxios({
    baseURL: 'https://reporting.api.later.com',
    timeout: 30000,
    maxRedirects: 0
  })
};
const expiry = (token: string, required: boolean): string | undefined => {
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')
    );
    const parsed = z.object({ exp: z.number().int().positive() }).safeParse(payload);
    if (
      parsed.success &&
      Number.isSafeInteger(parsed.data.exp) &&
      parsed.data.exp * 1000 > Date.now() &&
      parsed.data.exp * 1000 <= 8640000000000000
    )
      return new Date(parsed.data.exp * 1000).toISOString();
  } catch {
    /* Opaque legacy tokens need not have a JWT expiry. */
  }
  if (required)
    throw invalid(
      'Later returned a token without a usable future JWT expiry. Reconnect Reporting API v2.'
    );
  return undefined;
};
const exchange = async (input: z.infer<typeof inputSchema>, apiVersion: 'v1' | 'v2') => {
  if (!input.clientId.trim() || !input.clientSecret.trim())
    throw invalid('Both clientId and clientSecret are required.');
  let data: unknown;
  try {
    data = (await clients[apiVersion].post('/oauth/token', input)).data;
  } catch (error) {
    throw laterError(error);
  }
  const result = z
    .object({
      jwt: z.string().optional(),
      token: z.string().optional(),
      access_token: z.string().optional()
    })
    .safeParse(data);
  if (!result.success) throw invalid('Later returned an invalid credential response.');
  const token =
    apiVersion === 'v2'
      ? result.data.jwt
      : (result.data.token ?? result.data.access_token ?? result.data.jwt);
  if (
    !token ||
    [...token].some(
      char => /\s/.test(char) || char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127
    )
  )
    throw invalid('Later returned an invalid bearer token.');
  // JWT payload decoding is used only for scheduling expiry, never for authorization or identity.
  return { output: { token, apiVersion, expiresAt: expiry(token, apiVersion === 'v2') } };
};
export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiVersion: z.enum(['v1', 'v2']).optional(),
      expiresAt: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    key: 'client_credentials',
    name: 'Legacy Reporting API v1',
    inputSchema,
    getOutput: ctx => exchange(ctx.input, 'v1'),
    handleTokenRefresh: (ctx: { input: z.infer<typeof inputSchema> }) =>
      exchange(ctx.input, 'v1')
  })
  .addCustomAuth({
    type: 'auth.custom',
    key: 'client_credentials_v2',
    name: 'Reporting API v2',
    inputSchema,
    getOutput: ctx => exchange(ctx.input, 'v2'),
    handleTokenRefresh: (ctx: { input: z.infer<typeof inputSchema> }) =>
      exchange(ctx.input, 'v2')
  });
