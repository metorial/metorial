import { SlateTool } from 'slates';
import { z } from 'zod';
import { cognitoServiceError } from '../lib/errors';
import { createIdentityClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageIdentityPoolRoles = SlateTool.create(spec, {
  name: 'Manage Identity Pool Roles',
  key: 'manage_identity_pool_roles',
  description: `Get or set IAM roles for a Cognito identity pool. Identity pool roles control the AWS credentials issued to authenticated and unauthenticated identities.`,
  instructions: [
    'Roles uses keys "authenticated" and/or "unauthenticated" with IAM role ARNs as values.',
    'Role mappings are keyed by identity provider, such as graph.facebook.com or cognito-idp.<region>.amazonaws.com/<userPoolId>:<clientId>.'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'set']).describe('Operation to perform'),
      identityPoolId: z.string().describe('Identity pool ID in REGION:GUID format'),
      roles: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'IAM role ARN map required for set. Use authenticated and/or unauthenticated keys.'
        ),
      roleMappings: z
        .record(z.string(), z.record(z.string(), z.any()))
        .optional()
        .describe('Advanced provider role mappings for set')
    })
  )
  .output(
    z.object({
      identityPoolId: z.string(),
      roles: z.record(z.string(), z.string()).optional(),
      roleMappings: z.record(z.string(), z.any()).optional(),
      success: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createIdentityClient(ctx);
    let { action, identityPoolId } = ctx.input;

    if (action === 'get') {
      let result = await client.getIdentityPoolRoles(identityPoolId);
      return {
        output: {
          identityPoolId: result.IdentityPoolId,
          roles: result.Roles,
          roleMappings: result.RoleMappings
        },
        message: `Retrieved roles for identity pool **${identityPoolId}**.`
      };
    }

    if (action === 'set') {
      if (!ctx.input.roles) {
        throw cognitoServiceError('roles is required for set');
      }

      await client.setIdentityPoolRoles({
        IdentityPoolId: identityPoolId,
        Roles: ctx.input.roles,
        RoleMappings: ctx.input.roleMappings
      });

      return {
        output: {
          identityPoolId,
          roles: ctx.input.roles,
          roleMappings: ctx.input.roleMappings,
          success: true
        },
        message: `Updated roles for identity pool **${identityPoolId}**.`
      };
    }

    throw cognitoServiceError(`Unknown action: ${action}`);
  })
  .build();
