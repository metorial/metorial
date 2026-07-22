import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import {
  API_VERSION_DESCRIPTION,
  DEFAULT_API_VERSION,
  normalizeConnection,
  SERVER_URL_DESCRIPTION,
  SITE_CONTENT_URL_DESCRIPTION
} from './lib/connection';
import { tableauApiError, tableauServiceError } from './lib/errors';

type TableauAuthOutput = {
  token: string;
  siteId: string;
  userId: string;
  expiresAt?: string;
  authMethod?: 'personal_access_token' | 'username_password' | 'connected_app_jwt';
  serverUrl?: string;
  apiVersion?: string;
  siteContentUrl?: string;
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

let withSignInHint = (serviceError: ReturnType<typeof tableauApiError>) => {
  let message = serviceError.data?.message;
  if (typeof message === 'string' && message.includes('401001')) {
    serviceError.data.message =
      `${message} — check that the site content URL is only the site name after /site/ in your Tableau browser URL (e.g. "mysite", not a full URL), ` +
      `that the credentials are still valid (Tableau Cloud personal access tokens expire after 15 days without use and are invalidated when a token with the same name is created), ` +
      `and that the signing-in user has access to the site.`;
  }
  return serviceError;
};

let signIn = async (
  input: TableauSignInInput,
  credentials: Record<string, unknown>,
  authMethod: NonNullable<TableauAuthOutput['authMethod']>
) => {
  let { serverUrl, siteContentUrl, apiVersion } = normalizeConnection(input);
  let http = createAxios({ baseURL: serverUrl });

  try {
    let response = await http.post(`/api/${apiVersion}/auth/signin`, {
      credentials: {
        ...credentials,
        site: {
          contentUrl: siteContentUrl
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
        expiresAt: estimateTokenExpiresAt(serverUrl),
        authMethod,
        serverUrl,
        apiVersion,
        siteContentUrl
      }
    };
  } catch (error) {
    throw withSignInHint(tableauApiError(error, 'sign-in'));
  }
};

let getProfile = async (ctx: { output: TableauAuthOutput; input: any }) => {
  return {
    profile: {
      id: ctx.output.userId,
      siteId: ctx.output.siteId,
      siteContentUrl: ctx.output.siteContentUrl,
      serverUrl: ctx.output.serverUrl,
      authMethod: ctx.output.authMethod,
      expiresAt: ctx.output.expiresAt
    }
  };
};

let connectionInputFields = {
  serverUrl: z.string().describe(SERVER_URL_DESCRIPTION),
  siteContentUrl: z.string().default('').describe(SITE_CONTENT_URL_DESCRIPTION),
  apiVersion: z.string().default(DEFAULT_API_VERSION).describe(API_VERSION_DESCRIPTION)
};

let personalAccessTokenAuth = {
  type: 'auth.custom' as const,
  name: 'Personal Access Token',
  key: 'personal_access_token',

  docs: [
    {
      type: 'docs.auth.custom' as const,
      name: 'Tableau personal access tokens',
      url: 'https://help.tableau.com/current/online/en-us/security_personal_access_tokens.htm'
    }
  ],

  inputSchema: z.object({
    ...connectionInputFields,
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

  docs: [
    {
      type: 'docs.auth.custom' as const,
      name: 'Tableau REST API sign-in',
      url: 'https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_auth.htm'
    }
  ],

  inputSchema: z.object({
    ...connectionInputFields,
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

  docs: [
    {
      type: 'docs.auth.custom' as const,
      name: 'Tableau connected apps',
      url: 'https://help.tableau.com/current/online/en-us/connected_apps.htm'
    }
  ],

  inputSchema: z.object({
    ...connectionInputFields,
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
        .describe('Authentication method used to obtain the Tableau credentials token'),
      serverUrl: z
        .string()
        .optional()
        .describe('Normalized Tableau base URL the credentials token was issued by'),
      apiVersion: z.string().optional().describe('Tableau REST API version used at sign-in'),
      siteContentUrl: z
        .string()
        .optional()
        .describe('Normalized site content URL (site name) used at sign-in')
    })
  )
  .addCustomAuth(personalAccessTokenAuth)
  .addCustomAuth(usernamePasswordAuth)
  .addCustomAuth(connectedAppJwtAuth);
