import { SlateAuth } from 'slates';
import { z } from 'zod';
import { TRIPLETEX_BASE_URLS, TripletexClient } from './lib/client';
import { tripletexValidationError } from './lib/errors';

export let authOutputSchema = z.object({
  authMethod: z
    .enum(['jwt_refresh_token', 'consumer_employee_token'])
    .describe('Tripletex credential exchange mode'),
  environment: z.enum(['production', 'test']).describe('Tripletex API environment'),
  baseUrl: z.string().describe('Tripletex API base URL'),
  refreshToken: z
    .string()
    .optional()
    .describe('Tripletex JWT refresh token for internal integrations'),
  consumerToken: z
    .string()
    .optional()
    .describe('Tripletex consumer token for commercial integrations'),
  employeeToken: z
    .string()
    .optional()
    .describe('Tripletex employee token for commercial integrations'),
  companyId: z
    .string()
    .optional()
    .describe('Default target company id; 0 means the employee token owner company'),
  sessionTtlSeconds: z
    .number()
    .int()
    .optional()
    .describe('Session token TTL used with JWT refresh-token mode'),
  sessionExpirationDate: z
    .string()
    .optional()
    .describe('Session token expiration date used with consumer/employee token mode')
});

export type TripletexAuthOutput = z.infer<typeof authOutputSchema>;

let environmentSchema = z
  .enum(['production', 'test'])
  .optional()
  .describe('Tripletex environment. Use test for api-test.tripletex.tech accounts.');

let companyIdSchema = z
  .string()
  .optional()
  .describe('Optional default target company id. Omit or use 0 for the token owner company.');

let jwtRefreshTokenInputSchema = z.object({
  environment: z
    .enum(['production', 'test'])
    .optional()
    .describe('Tripletex environment. Use test for api-test.tripletex.tech accounts.'),
  refreshToken: z.string().describe('Tripletex JWT refresh token for internal integrations.'),
  companyId: companyIdSchema,
  sessionTtlSeconds: z
    .number()
    .int()
    .min(300)
    .max(28800)
    .optional()
    .describe('JWT refresh-token session TTL in seconds. Defaults to 3600.')
});

let consumerEmployeeTokenInputSchema = z.object({
  environment: environmentSchema,
  consumerToken: z.string().describe('Tripletex consumer token.'),
  employeeToken: z.string().describe('Tripletex employee token.'),
  companyId: companyIdSchema,
  sessionExpirationDate: z
    .string()
    .optional()
    .describe(
      'Optional YYYY-MM-DD expiration date for session creation. If omitted, each invocation uses tomorrow.'
    )
});

let normalizeJwtRefreshTokenOutput = (
  input: z.infer<typeof jwtRefreshTokenInputSchema>
): TripletexAuthOutput => {
  let environment = input.environment ?? 'production';
  let companyId = input.companyId?.trim() || undefined;

  if (!input.refreshToken.trim()) {
    throw tripletexValidationError('refreshToken is required.');
  }

  return {
    authMethod: 'jwt_refresh_token',
    environment,
    baseUrl: TRIPLETEX_BASE_URLS[environment],
    refreshToken: input.refreshToken,
    companyId,
    sessionTtlSeconds: input.sessionTtlSeconds ?? 3600
  };
};

let normalizeConsumerEmployeeTokenOutput = (
  input: z.infer<typeof consumerEmployeeTokenInputSchema>
): TripletexAuthOutput => {
  let environment = input.environment ?? 'production';
  let companyId = input.companyId?.trim() || undefined;

  if (!input.consumerToken.trim()) {
    throw tripletexValidationError('consumerToken is required.');
  }

  if (!input.employeeToken.trim()) {
    throw tripletexValidationError('employeeToken is required.');
  }

  return {
    authMethod: 'consumer_employee_token',
    environment,
    baseUrl: TRIPLETEX_BASE_URLS[environment],
    consumerToken: input.consumerToken,
    employeeToken: input.employeeToken,
    companyId,
    sessionExpirationDate: input.sessionExpirationDate
  };
};

let getTripletexProfile = async (ctx: { output: TripletexAuthOutput }) => {
  let client = new TripletexClient(ctx.output);
  let whoAmI = await client.whoAmI(
    {
      fields:
        'employeeId,companyId,employee(id,displayName,email),company(id,name,organizationNumber),language'
    },
    ctx.output.companyId
  );

  let employee =
    typeof whoAmI?.employee === 'object' && whoAmI.employee !== null
      ? (whoAmI.employee as Record<string, unknown>)
      : undefined;
  let company =
    typeof whoAmI?.company === 'object' && whoAmI.company !== null
      ? (whoAmI.company as Record<string, unknown>)
      : undefined;

  let employeeId = profileValue(whoAmI, 'employeeId') ?? profileValue(employee, 'id');
  let companyId = profileValue(whoAmI, 'companyId') ?? profileValue(company, 'id');
  let email = profileValue(employee, 'email');
  let name =
    profileValue(employee, 'displayName') ??
    profileValue(company, 'name') ??
    employeeId ??
    companyId ??
    'Tripletex';

  return {
    profile: {
      id: employeeId ?? companyId ?? ctx.output.companyId ?? '0',
      name,
      email
    }
  };
};

let profileValue = (value: unknown, key: string) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  let child = (value as Record<string, unknown>)[key];
  return typeof child === 'string' || typeof child === 'number' ? String(child) : undefined;
};

export let auth = SlateAuth.create()
  .output(authOutputSchema)
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Tripletex Consumer and Employee Tokens',
    key: 'consumer_employee_token',
    inputSchema: consumerEmployeeTokenInputSchema,
    getOutput: async ctx => ({
      output: normalizeConsumerEmployeeTokenOutput(ctx.input)
    }),
    getProfile: getTripletexProfile
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Tripletex JWT Refresh Token',
    key: 'jwt_refresh_token',
    inputSchema: jwtRefreshTokenInputSchema,
    getOutput: async ctx => ({
      output: normalizeJwtRefreshTokenOutput(ctx.input)
    }),
    getProfile: getTripletexProfile
  });
