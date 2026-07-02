import { SlateTool } from 'slates';
import { z } from 'zod';
import { cognitoServiceError } from '../lib/errors';
import { createCognitoClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageIdentityProvider = SlateTool.create(spec, {
  name: 'Manage Identity Provider',
  key: 'manage_identity_provider',
  description: `Create, get, update, delete, or list federated identity providers (SAML, OIDC, Google, Facebook, Apple, Amazon) in a Cognito user pool. Manages federation configuration for external sign-in sources.`,
  instructions: [
    'Provider details vary by type. For OIDC: oidc_issuer, client_id, client_secret, authorize_scopes, etc. For SAML: MetadataURL or MetadataFile.',
    'Attribute mapping maps user pool attributes to IdP attributes, e.g., {"email": "idp_email_field"}.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      userPoolId: z.string().describe('User pool ID'),
      providerName: z
        .string()
        .optional()
        .describe('Identity provider name (required for create, get, update, delete)'),
      providerType: z
        .enum(['SAML', 'Facebook', 'Google', 'LoginWithAmazon', 'SignInWithApple', 'OIDC'])
        .optional()
        .describe('Provider type (required for create)'),
      providerDetails: z
        .record(z.string(), z.string())
        .optional()
        .describe('Provider configuration details (required for create)'),
      attributeMapping: z
        .record(z.string(), z.string())
        .optional()
        .describe('Mapping of user pool attributes to IdP attributes'),
      idpIdentifiers: z
        .array(z.string())
        .optional()
        .describe('List of IdP identifiers (e.g., domain names)'),
      maxResults: z.number().min(1).max(60).optional().describe('Max results for list'),
      nextToken: z.string().optional().describe('Pagination token for list')
    })
  )
  .output(
    z.object({
      providerName: z.string().optional(),
      providerType: z.string().optional(),
      providerDetails: z.record(z.string(), z.string()).optional(),
      attributeMapping: z.record(z.string(), z.string()).optional(),
      idpIdentifiers: z.array(z.string()).optional(),
      creationDate: z.number().optional(),
      lastModifiedDate: z.number().optional(),
      providers: z
        .array(
          z.object({
            providerName: z.string(),
            providerType: z.string(),
            creationDate: z.number().optional(),
            lastModifiedDate: z.number().optional()
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

    let mapProvider = (p: any) => ({
      providerName: p.ProviderName,
      providerType: p.ProviderType,
      providerDetails: p.ProviderDetails,
      attributeMapping: p.AttributeMapping,
      idpIdentifiers: p.IdpIdentifiers,
      creationDate: p.CreationDate,
      lastModifiedDate: p.LastModifiedDate
    });

    if (action === 'list') {
      let result = await client.listIdentityProviders(
        userPoolId,
        ctx.input.maxResults,
        ctx.input.nextToken
      );
      let providers = (result.Providers || []).map((p: any) => ({
        providerName: p.ProviderName,
        providerType: p.ProviderType,
        creationDate: p.CreationDate,
        lastModifiedDate: p.LastModifiedDate
      }));

      return {
        output: { providers, nextToken: result.NextToken },
        message: `Found **${providers.length}** identity provider(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.providerName || !ctx.input.providerType || !ctx.input.providerDetails) {
        throw cognitoServiceError(
          'providerName, providerType, and providerDetails are required for create'
        );
      }

      let params: Record<string, any> = {
        UserPoolId: userPoolId,
        ProviderName: ctx.input.providerName,
        ProviderType: ctx.input.providerType,
        ProviderDetails: ctx.input.providerDetails
      };
      if (ctx.input.attributeMapping) params.AttributeMapping = ctx.input.attributeMapping;
      if (ctx.input.idpIdentifiers) params.IdpIdentifiers = ctx.input.idpIdentifiers;

      let result = await client.createIdentityProvider(params);
      return {
        output: mapProvider(result.IdentityProvider),
        message: `Created identity provider **${ctx.input.providerName}** (${ctx.input.providerType}).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.providerName) {
        throw cognitoServiceError('providerName is required for get');
      }
      let result = await client.describeIdentityProvider(userPoolId, ctx.input.providerName);
      return {
        output: mapProvider(result.IdentityProvider),
        message: `Identity provider **${ctx.input.providerName}** details retrieved.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.providerName) {
        throw cognitoServiceError('providerName is required for update');
      }
      let params: Record<string, any> = {
        UserPoolId: userPoolId,
        ProviderName: ctx.input.providerName
      };
      if (ctx.input.providerDetails) params.ProviderDetails = ctx.input.providerDetails;
      if (ctx.input.attributeMapping) params.AttributeMapping = ctx.input.attributeMapping;
      if (ctx.input.idpIdentifiers) params.IdpIdentifiers = ctx.input.idpIdentifiers;

      let result = await client.updateIdentityProvider(params);
      return {
        output: mapProvider(result.IdentityProvider),
        message: `Updated identity provider **${ctx.input.providerName}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.providerName) {
        throw cognitoServiceError('providerName is required for delete');
      }
      await client.deleteIdentityProvider(userPoolId, ctx.input.providerName);
      return {
        output: { providerName: ctx.input.providerName, deleted: true },
        message: `Deleted identity provider **${ctx.input.providerName}**.`
      };
    }

    throw cognitoServiceError(`Unknown action: ${action}`);
  })
  .build();
