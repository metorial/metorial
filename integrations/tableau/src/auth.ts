import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { tableauApiError, tableauServiceError } from './lib/errors';

type TableauAuthOutput = {
  token: string;
  siteId: string;
  userId: string;
  expiresAt?: string;
  authMethod?: 'personal_access_token' | 'username_password' | 'connected_app_jwt';
};

type TableauSignInInput = {
  serverUrl: string;
  siteContentUrl: string;
  apiVersion: string;
};

type TableauPersonalAccessTokenInput = TableauSignInInput & {
  tokenName: string;
  tokenSecret: string;
};

type TableauUsernamePasswordInput = TableauSignInInput & {
  username: string;
  password: string;
};

type TableauConnectedAppJwtInput = TableauSignInInput & {
  jwt: string;
  isUat?: boolean;
};

type TableauRefreshContext<Input> = {
  output: TableauAuthOutput;
  input: Input;
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

let estimateTokenExpiresAt = (serverUrl: string) => {
  let lifetimeMinutes = /\.online\.tableau\.com/i.test(serverUrl) ? 110 : 230;
  return new Date(Date.now() + lifetimeMinutes * 60 * 1000).toISOString();
};

let signIn = async (
  input: TableauSignInInput,
  credentials: Record<string, unknown>,
  authMethod: NonNullable<TableauAuthOutput['authMethod']>
) => {
  let baseUrl = input.serverUrl.replace(/\/+$/, '');
  let http = createAxios({ baseURL: baseUrl });

  try {
    let response = await http.post(`/api/${input.apiVersion}/auth/signin`, {
      credentials: {
        ...credentials,
        site: {
          contentUrl: input.siteContentUrl
        }
      }
    });

    let responseCredentials = response.data?.credentials;
    if (
      !responseCredentials?.token ||
      !responseCredentials?.site?.id ||
      !responseCredentials?.user?.id
    ) {
      throw tableauServiceError(
        'Tableau sign-in response did not include token, site ID, and user ID.'
      );
    }

    return {
      output: {
        token: responseCredentials.token,
        siteId: responseCredentials.site.id,
        userId: responseCredentials.user.id,
        expiresAt: estimateTokenExpiresAt(input.serverUrl),
        authMethod
      }
    };
  } catch (error) {
    throw tableauApiError(error, 'sign-in');
  }
};

let getProfile = async (ctx: { output: TableauAuthOutput; input: any }) => {
  return {
    profile: {
      id: ctx.output.userId,
      siteId: ctx.output.siteId,
      authMethod: ctx.output.authMethod,
      expiresAt: ctx.output.expiresAt
    }
  };
};

let personalAccessTokenAuth = {
  type: 'auth.custom' as const,
  name: 'Personal Access Token',
  key: 'personal_access_token',

  inputSchema: z.object({
    serverUrl: z.string().describe('Tableau Server or Cloud URL'),
    siteContentUrl: z.string().default('').describe('Site content URL'),
    apiVersion: z.string().default('3.28').describe('API version'),
    tokenName: z.string().describe('Personal access token name'),
    tokenSecret: z.string().describe('Personal access token secret')
  }),

  getOutput: async (ctx: { input: TableauPersonalAccessTokenInput }) => {
    let { serverUrl, siteContentUrl, apiVersion, tokenName, tokenSecret } = ctx.input;

    return await signIn(
      { serverUrl, siteContentUrl, apiVersion },
      {
        personalAccessTokenName: tokenName,
        personalAccessTokenSecret: tokenSecret
      },
      'personal_access_token'
    );
  },

  handleTokenRefresh: async (ctx: TableauRefreshContext<TableauPersonalAccessTokenInput>) => {
    let { serverUrl, siteContentUrl, apiVersion, tokenName, tokenSecret } = ctx.input;

    return await signIn(
      { serverUrl, siteContentUrl, apiVersion },
      {
        personalAccessTokenName: tokenName,
        personalAccessTokenSecret: tokenSecret
      },
      'personal_access_token'
    );
  },

  getProfile
};

let usernamePasswordAuth = {
  type: 'auth.custom' as const,
  name: 'Username & Password',
  key: 'username_password',

  inputSchema: z.object({
    serverUrl: z.string().describe('Tableau Server or Cloud URL'),
    siteContentUrl: z.string().default('').describe('Site content URL'),
    apiVersion: z.string().default('3.28').describe('API version'),
    username: z.string().describe('Tableau username'),
    password: z.string().describe('Tableau password')
  }),

  getOutput: async (ctx: { input: TableauUsernamePasswordInput }) => {
    let { serverUrl, siteContentUrl, apiVersion, username, password } = ctx.input;

    return await signIn(
      { serverUrl, siteContentUrl, apiVersion },
      {
        name: username,
        password
      },
      'username_password'
    );
  },

  handleTokenRefresh: async (ctx: TableauRefreshContext<TableauUsernamePasswordInput>) => {
    let { serverUrl, siteContentUrl, apiVersion, username, password } = ctx.input;

    return await signIn(
      { serverUrl, siteContentUrl, apiVersion },
      {
        name: username,
        password
      },
      'username_password'
    );
  },

  getProfile
};

let connectedAppJwtAuth = {
  type: 'auth.custom' as const,
  name: 'Connected App JWT',
  key: 'connected_app_jwt',

  inputSchema: z.object({
    serverUrl: z.string().describe('Tableau Server or Cloud URL'),
    siteContentUrl: z.string().default('').describe('Site content URL'),
    apiVersion: z.string().default('3.28').describe('API version'),
    jwt: z.string().describe('JWT generated for a Tableau connected app or UAT'),
    isUat: z
      .boolean()
      .optional()
      .describe('Set true when signing in with a Tableau Cloud unified access token JWT')
  }),

  getOutput: async (ctx: { input: TableauConnectedAppJwtInput }) => {
    let { serverUrl, siteContentUrl, apiVersion, jwt, isUat } = ctx.input;

    return await signIn(
      { serverUrl, siteContentUrl, apiVersion },
      {
        jwt,
        ...(isUat !== undefined ? { isUat } : {})
      },
      'connected_app_jwt'
    );
  },

  getProfile
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Tableau credentials token for API requests'),
      siteId: z.string().describe('Site LUID returned from sign-in'),
      userId: z.string().describe('User LUID returned from sign-in'),
      expiresAt: z
        .string()
        .optional()
        .describe('Estimated ISO timestamp when the Tableau credentials token expires'),
      authMethod: z
        .enum(['personal_access_token', 'username_password', 'connected_app_jwt'])
        .optional()
        .describe('Authentication method used to obtain the Tableau credentials token')
    })
  )
  .addCustomAuth(personalAccessTokenAuth)
  .addCustomAuth(usernamePasswordAuth)
  .addCustomAuth(connectedAppJwtAuth);
