import { SlateTool } from 'slates';
import { z } from 'zod';
import { cognitoServiceError } from '../lib/errors';
import { createCognitoClient } from '../lib/helpers';
import { spec } from '../spec';

let tokenValidityUnitsSchema = z
  .object({
    accessToken: z.enum(['seconds', 'minutes', 'hours', 'days']).optional(),
    idToken: z.enum(['seconds', 'minutes', 'hours', 'days']).optional(),
    refreshToken: z.enum(['seconds', 'minutes', 'hours', 'days']).optional()
  })
  .optional();

let refreshTokenRotationSchema = z
  .object({
    feature: z.enum(['ENABLED', 'DISABLED']).describe('Refresh token rotation state'),
    retryGracePeriodSeconds: z
      .number()
      .min(0)
      .max(60)
      .optional()
      .describe('Grace period for token replay during rotation, in seconds')
  })
  .optional();

export let manageAppClient = SlateTool.create(spec, {
  name: 'Manage App Client',
  key: 'manage_app_client',
  description: `Create, get, update, delete, or list app clients for a Cognito user pool. App clients define how applications interact with the user pool, including authentication flows, OAuth scopes, callback URLs, and token settings.`,
  instructions: [
    'When listing, only basic client info (ID, name) is returned. Use get for full details.',
    'When updating, omitted fields are reset to defaults. Fetch current config first if you want to preserve values.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      userPoolId: z.string().describe('User pool ID'),
      clientId: z
        .string()
        .optional()
        .describe('App client ID (required for get, update, delete)'),
      clientName: z.string().optional().describe('App client name (required for create)'),
      generateSecret: z
        .boolean()
        .optional()
        .describe('Generate a client secret (for create only)'),
      clientSecret: z
        .string()
        .optional()
        .describe('Custom client secret for create. Do not combine with generateSecret.'),
      explicitAuthFlows: z
        .array(z.string())
        .optional()
        .describe(
          'Allowed auth flows, including current ALLOW_* values such as ALLOW_USER_AUTH, ALLOW_USER_SRP_AUTH, ALLOW_USER_PASSWORD_AUTH, and ALLOW_REFRESH_TOKEN_AUTH'
        ),
      allowedOAuthFlows: z
        .array(z.enum(['code', 'implicit', 'client_credentials']))
        .optional(),
      allowedOAuthScopes: z
        .array(z.string())
        .optional()
        .describe('OAuth scopes (e.g., openid, email, profile)'),
      allowedOAuthFlowsUserPoolClient: z
        .boolean()
        .optional()
        .describe('Enable OAuth flows for this client'),
      callbackUrls: z.array(z.string()).optional().describe('Allowed callback URLs'),
      logoutUrls: z.array(z.string()).optional().describe('Allowed logout URLs'),
      defaultRedirectUri: z.string().optional(),
      supportedIdentityProviders: z
        .array(z.string())
        .optional()
        .describe('IdPs to support (e.g., COGNITO, Google)'),
      accessTokenValidity: z.number().optional(),
      idTokenValidity: z.number().optional(),
      refreshTokenValidity: z.number().optional(),
      authSessionValidity: z
        .number()
        .min(3)
        .max(15)
        .optional()
        .describe('Authentication flow session validity in minutes (3-15)'),
      tokenValidityUnits: tokenValidityUnitsSchema,
      refreshTokenRotation: refreshTokenRotationSchema,
      enableTokenRevocation: z.boolean().optional(),
      enablePropagateAdditionalUserContextData: z
        .boolean()
        .optional()
        .describe(
          'Allow additional user context data such as source IP for threat protection'
        ),
      preventUserExistenceErrors: z.enum(['ENABLED', 'LEGACY']).optional(),
      readAttributes: z.array(z.string()).optional(),
      writeAttributes: z.array(z.string()).optional(),
      maxResults: z.number().min(1).max(60).optional(),
      nextToken: z.string().optional()
    })
  )
  .output(
    z.object({
      clientId: z.string().optional(),
      clientName: z.string().optional(),
      clientSecret: z.string().optional(),
      userPoolId: z.string().optional(),
      explicitAuthFlows: z.array(z.string()).optional(),
      allowedOAuthFlows: z.array(z.string()).optional(),
      allowedOAuthScopes: z.array(z.string()).optional(),
      callbackUrls: z.array(z.string()).optional(),
      logoutUrls: z.array(z.string()).optional(),
      supportedIdentityProviders: z.array(z.string()).optional(),
      accessTokenValidity: z.number().optional(),
      idTokenValidity: z.number().optional(),
      refreshTokenValidity: z.number().optional(),
      authSessionValidity: z.number().optional(),
      refreshTokenRotationFeature: z.string().optional(),
      refreshTokenRotationRetryGracePeriodSeconds: z.number().optional(),
      enableTokenRevocation: z.boolean().optional(),
      enablePropagateAdditionalUserContextData: z.boolean().optional(),
      preventUserExistenceErrors: z.string().optional(),
      defaultRedirectUri: z.string().optional(),
      creationDate: z.number().optional(),
      lastModifiedDate: z.number().optional(),
      clients: z
        .array(
          z.object({
            clientId: z.string(),
            clientName: z.string(),
            userPoolId: z.string()
          })
        )
        .optional(),
      deleted: z.boolean().optional(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createCognitoClient(ctx);
    let { action, userPoolId } = ctx.input;

    let mapClient = (c: any) => ({
      clientId: c.ClientId,
      clientName: c.ClientName,
      clientSecret: c.ClientSecret,
      userPoolId: c.UserPoolId,
      explicitAuthFlows: c.ExplicitAuthFlows,
      allowedOAuthFlows: c.AllowedOAuthFlows,
      allowedOAuthScopes: c.AllowedOAuthScopes,
      callbackUrls: c.CallbackURLs,
      logoutUrls: c.LogoutURLs,
      supportedIdentityProviders: c.SupportedIdentityProviders,
      accessTokenValidity: c.AccessTokenValidity,
      idTokenValidity: c.IdTokenValidity,
      refreshTokenValidity: c.RefreshTokenValidity,
      authSessionValidity: c.AuthSessionValidity,
      refreshTokenRotationFeature: c.RefreshTokenRotation?.Feature,
      refreshTokenRotationRetryGracePeriodSeconds:
        c.RefreshTokenRotation?.RetryGracePeriodSeconds,
      enableTokenRevocation: c.EnableTokenRevocation,
      enablePropagateAdditionalUserContextData: c.EnablePropagateAdditionalUserContextData,
      preventUserExistenceErrors: c.PreventUserExistenceErrors,
      defaultRedirectUri: c.DefaultRedirectURI,
      creationDate: c.CreationDate,
      lastModifiedDate: c.LastModifiedDate
    });

    let buildClientParams = () => {
      let params: Record<string, any> = { UserPoolId: userPoolId };
      if (ctx.input.clientName) params.ClientName = ctx.input.clientName;
      if (ctx.input.clientId) params.ClientId = ctx.input.clientId;
      if (ctx.input.generateSecret === true && ctx.input.clientSecret) {
        throw cognitoServiceError('clientSecret cannot be combined with generateSecret');
      }
      if (ctx.input.generateSecret !== undefined)
        params.GenerateSecret = ctx.input.generateSecret;
      if (ctx.input.clientSecret) params.ClientSecret = ctx.input.clientSecret;
      if (ctx.input.explicitAuthFlows) params.ExplicitAuthFlows = ctx.input.explicitAuthFlows;
      if (ctx.input.allowedOAuthFlows) params.AllowedOAuthFlows = ctx.input.allowedOAuthFlows;
      if (ctx.input.allowedOAuthScopes)
        params.AllowedOAuthScopes = ctx.input.allowedOAuthScopes;
      if (ctx.input.allowedOAuthFlowsUserPoolClient !== undefined)
        params.AllowedOAuthFlowsUserPoolClient = ctx.input.allowedOAuthFlowsUserPoolClient;
      if (ctx.input.callbackUrls) params.CallbackURLs = ctx.input.callbackUrls;
      if (ctx.input.logoutUrls) params.LogoutURLs = ctx.input.logoutUrls;
      if (ctx.input.defaultRedirectUri)
        params.DefaultRedirectURI = ctx.input.defaultRedirectUri;
      if (ctx.input.supportedIdentityProviders)
        params.SupportedIdentityProviders = ctx.input.supportedIdentityProviders;
      if (ctx.input.accessTokenValidity !== undefined)
        params.AccessTokenValidity = ctx.input.accessTokenValidity;
      if (ctx.input.idTokenValidity !== undefined)
        params.IdTokenValidity = ctx.input.idTokenValidity;
      if (ctx.input.refreshTokenValidity !== undefined)
        params.RefreshTokenValidity = ctx.input.refreshTokenValidity;
      if (ctx.input.authSessionValidity !== undefined)
        params.AuthSessionValidity = ctx.input.authSessionValidity;
      if (ctx.input.tokenValidityUnits) {
        params.TokenValidityUnits = {
          AccessToken: ctx.input.tokenValidityUnits.accessToken,
          IdToken: ctx.input.tokenValidityUnits.idToken,
          RefreshToken: ctx.input.tokenValidityUnits.refreshToken
        };
      }
      if (ctx.input.refreshTokenRotation) {
        params.RefreshTokenRotation = {
          Feature: ctx.input.refreshTokenRotation.feature,
          RetryGracePeriodSeconds: ctx.input.refreshTokenRotation.retryGracePeriodSeconds
        };
      }
      if (ctx.input.enableTokenRevocation !== undefined)
        params.EnableTokenRevocation = ctx.input.enableTokenRevocation;
      if (ctx.input.enablePropagateAdditionalUserContextData !== undefined) {
        params.EnablePropagateAdditionalUserContextData =
          ctx.input.enablePropagateAdditionalUserContextData;
      }
      if (ctx.input.preventUserExistenceErrors)
        params.PreventUserExistenceErrors = ctx.input.preventUserExistenceErrors;
      if (ctx.input.readAttributes) params.ReadAttributes = ctx.input.readAttributes;
      if (ctx.input.writeAttributes) params.WriteAttributes = ctx.input.writeAttributes;
      return params;
    };

    if (action === 'list') {
      let result = await client.listUserPoolClients(
        userPoolId,
        ctx.input.maxResults,
        ctx.input.nextToken
      );
      let clients = (result.UserPoolClients || []).map((c: any) => ({
        clientId: c.ClientId,
        clientName: c.ClientName,
        userPoolId: c.UserPoolId
      }));

      return {
        output: { clients, nextToken: result.NextToken },
        message: `Found **${clients.length}** app client(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.clientName) {
        throw cognitoServiceError('clientName is required for create');
      }
      let result = await client.createUserPoolClient(buildClientParams());
      return {
        output: mapClient(result.UserPoolClient),
        message: `Created app client **${result.UserPoolClient.ClientName}** (${result.UserPoolClient.ClientId}).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.clientId) {
        throw cognitoServiceError('clientId is required for get');
      }
      let result = await client.describeUserPoolClient(userPoolId, ctx.input.clientId);
      return {
        output: mapClient(result.UserPoolClient),
        message: `App client **${result.UserPoolClient.ClientName}** details retrieved.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.clientId) {
        throw cognitoServiceError('clientId is required for update');
      }
      let result = await client.updateUserPoolClient(buildClientParams());
      return {
        output: mapClient(result.UserPoolClient),
        message: `Updated app client **${result.UserPoolClient.ClientName}** (${result.UserPoolClient.ClientId}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.clientId) {
        throw cognitoServiceError('clientId is required for delete');
      }
      await client.deleteUserPoolClient(userPoolId, ctx.input.clientId);
      return {
        output: { clientId: ctx.input.clientId, deleted: true },
        message: `Deleted app client **${ctx.input.clientId}**.`
      };
    }

    throw cognitoServiceError(`Unknown action: ${action}`);
  })
  .build();
