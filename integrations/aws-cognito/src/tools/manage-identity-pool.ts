import { SlateTool } from 'slates';
import { z } from 'zod';
import { cognitoServiceError } from '../lib/errors';
import { createIdentityClient } from '../lib/helpers';
import { spec } from '../spec';

let cognitoProviderSchema = z.object({
  providerName: z
    .string()
    .describe(
      'Cognito User Pool provider name (e.g., cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXX)'
    ),
  clientId: z.string().describe('App client ID'),
  serverSideTokenCheck: z.boolean().optional()
});

export let manageIdentityPool = SlateTool.create(spec, {
  name: 'Manage Identity Pool',
  key: 'manage_identity_pool',
  description: `Create, get, update, delete, or list Cognito identity pools (federated identities). Identity pools issue temporary AWS credentials to authenticated and guest users, enabling direct access to AWS services.`,
  instructions: [
    'Identity pool IDs follow the format "region:uuid" (e.g., us-east-1:12345678-1234-1234-1234-123456789012).',
    'When updating, identityPoolId, identityPoolName, and allowUnauthenticatedIdentities are all required.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      identityPoolId: z
        .string()
        .optional()
        .describe('Identity pool ID (required for get, update, delete)'),
      identityPoolName: z
        .string()
        .optional()
        .describe('Identity pool name (required for create and update)'),
      allowUnauthenticatedIdentities: z
        .boolean()
        .optional()
        .describe('Allow guest/unauthenticated access (required for create and update)'),
      cognitoIdentityProviders: z
        .array(cognitoProviderSchema)
        .optional()
        .describe('Cognito user pool providers to link'),
      supportedLoginProviders: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Social login providers as {domain: appId} (e.g., {"graph.facebook.com": "APP_ID"})'
        ),
      openIdConnectProviderArns: z.array(z.string()).optional().describe('OIDC provider ARNs'),
      samlProviderArns: z.array(z.string()).optional().describe('SAML provider ARNs'),
      identityPoolTags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Tags as key-value pairs'),
      maxResults: z.number().min(1).max(60).optional(),
      nextToken: z.string().optional()
    })
  )
  .output(
    z.object({
      identityPoolId: z.string().optional(),
      identityPoolName: z.string().optional(),
      allowUnauthenticatedIdentities: z.boolean().optional(),
      cognitoIdentityProviders: z
        .array(
          z.object({
            providerName: z.string(),
            clientId: z.string(),
            serverSideTokenCheck: z.boolean().optional()
          })
        )
        .optional(),
      supportedLoginProviders: z.record(z.string(), z.string()).optional(),
      openIdConnectProviderArns: z.array(z.string()).optional(),
      samlProviderArns: z.array(z.string()).optional(),
      identityPools: z
        .array(
          z.object({
            identityPoolId: z.string(),
            identityPoolName: z.string()
          })
        )
        .optional(),
      deleted: z.boolean().optional(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createIdentityClient(ctx);
    let { action } = ctx.input;

    let mapPool = (p: any) => ({
      identityPoolId: p.IdentityPoolId,
      identityPoolName: p.IdentityPoolName,
      allowUnauthenticatedIdentities: p.AllowUnauthenticatedIdentities,
      cognitoIdentityProviders: (p.CognitoIdentityProviders || []).map((c: any) => ({
        providerName: c.ProviderName,
        clientId: c.ClientId,
        serverSideTokenCheck: c.ServerSideTokenCheck
      })),
      supportedLoginProviders: p.SupportedLoginProviders,
      openIdConnectProviderArns: p.OpenIdConnectProviderARNs,
      samlProviderArns: p.SamlProviderARNs
    });

    let buildParams = () => {
      let params: Record<string, any> = {};
      if (ctx.input.identityPoolId) params.IdentityPoolId = ctx.input.identityPoolId;
      if (ctx.input.identityPoolName) params.IdentityPoolName = ctx.input.identityPoolName;
      if (ctx.input.allowUnauthenticatedIdentities !== undefined)
        params.AllowUnauthenticatedIdentities = ctx.input.allowUnauthenticatedIdentities;
      if (ctx.input.cognitoIdentityProviders) {
        params.CognitoIdentityProviders = ctx.input.cognitoIdentityProviders.map(c => ({
          ProviderName: c.providerName,
          ClientId: c.clientId,
          ServerSideTokenCheck: c.serverSideTokenCheck
        }));
      }
      if (ctx.input.supportedLoginProviders)
        params.SupportedLoginProviders = ctx.input.supportedLoginProviders;
      if (ctx.input.openIdConnectProviderArns)
        params.OpenIdConnectProviderARNs = ctx.input.openIdConnectProviderArns;
      if (ctx.input.samlProviderArns) params.SamlProviderARNs = ctx.input.samlProviderArns;
      if (ctx.input.identityPoolTags) params.IdentityPoolTags = ctx.input.identityPoolTags;
      return params;
    };

    if (action === 'list') {
      let result = await client.listIdentityPools(
        ctx.input.maxResults ?? 60,
        ctx.input.nextToken
      );
      let pools = (result.IdentityPools || []).map((p: any) => ({
        identityPoolId: p.IdentityPoolId,
        identityPoolName: p.IdentityPoolName
      }));

      return {
        output: { identityPools: pools, nextToken: result.NextToken },
        message: `Found **${pools.length}** identity pool(s).`
      };
    }

    if (action === 'create') {
      if (
        !ctx.input.identityPoolName ||
        ctx.input.allowUnauthenticatedIdentities === undefined
      ) {
        throw cognitoServiceError(
          'identityPoolName and allowUnauthenticatedIdentities are required for create'
        );
      }
      let result = await client.createIdentityPool(buildParams());
      return {
        output: mapPool(result),
        message: `Created identity pool **${result.IdentityPoolName}** (${result.IdentityPoolId}).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.identityPoolId) {
        throw cognitoServiceError('identityPoolId is required for get');
      }
      let result = await client.describeIdentityPool(ctx.input.identityPoolId);
      return {
        output: mapPool(result),
        message: `Identity pool **${result.IdentityPoolName}** details retrieved.`
      };
    }

    if (action === 'update') {
      if (
        !ctx.input.identityPoolId ||
        !ctx.input.identityPoolName ||
        ctx.input.allowUnauthenticatedIdentities === undefined
      ) {
        throw cognitoServiceError(
          'identityPoolId, identityPoolName, and allowUnauthenticatedIdentities are required for update'
        );
      }
      let result = await client.updateIdentityPool(buildParams());
      return {
        output: mapPool(result),
        message: `Updated identity pool **${result.IdentityPoolName}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.identityPoolId) {
        throw cognitoServiceError('identityPoolId is required for delete');
      }
      await client.deleteIdentityPool(ctx.input.identityPoolId);
      return {
        output: { identityPoolId: ctx.input.identityPoolId, deleted: true },
        message: `Deleted identity pool **${ctx.input.identityPoolId}**.`
      };
    }

    throw cognitoServiceError(`Unknown action: ${action}`);
  })
  .build();
