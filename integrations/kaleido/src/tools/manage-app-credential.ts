import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let manageAppCredential = SlateTool.create(spec, {
  name: 'Manage App Credential',
  key: 'manage_app_credential',
  description: `Create, list, retrieve, or delete application credentials for connecting to blockchain nodes and services. App credentials are environment-scoped, membership-bound credentials used for runtime API authentication.
**Important:** The credential password is only returned once upon creation and cannot be retrieved again.`,
  constraints: [
    'The credential password is shown only once after creation. Kaleido does not store plaintext tokens.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Action to perform'),
      consortiumId: z.string().describe('Consortium ID'),
      environmentId: z.string().describe('Environment ID'),
      appCredId: z
        .string()
        .optional()
        .describe('Application credential ID (required for get, delete)'),
      membershipId: z.string().optional().describe('Membership ID (required for create)'),
      name: z.string().optional().describe('Credential name')
    })
  )
  .output(
    z.object({
      appCredentials: z
        .array(
          z.object({
            appCredId: z.string().describe('Credential ID'),
            name: z.string().optional().describe('Credential name'),
            membershipId: z.string().optional().describe('Membership ID'),
            authType: z.string().optional().describe('Authentication type'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of credentials (for list action)'),
      appCredId: z.string().optional().describe('Credential ID'),
      name: z.string().optional().describe('Credential name'),
      membershipId: z.string().optional().describe('Membership ID'),
      username: z.string().optional().describe('Username (only on create)'),
      password: z.string().optional().describe('Password (only on create, one-time viewable)'),
      authType: z.string().optional().describe('Authentication type'),
      deleted: z.boolean().optional().describe('Whether the credential was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let creds = await client.listAppCreds(ctx.input.consortiumId, ctx.input.environmentId);
      let mapped = creds.map((c: any) => ({
        appCredId: c._id,
        name: c.name || undefined,
        membershipId: c.membership_id || undefined,
        authType: c.auth_type || undefined,
        createdAt: c.created_at || undefined
      }));

      return {
        output: { appCredentials: mapped },
        message: `Found **${mapped.length}** application credential(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.membershipId) throw new Error('Membership ID is required');

      let result = await client.createAppCred(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        {
          membership_id: ctx.input.membershipId,
          name: ctx.input.name
        }
      );

      return {
        output: {
          appCredId: result._id,
          name: result.name,
          membershipId: result.membership_id,
          username: result.username,
          password: result.password,
          authType: result.auth_type
        },
        message: `Created app credential (\`${result._id}\`). **Save the password now — it won't be shown again.**`
      };
    }

    if (!ctx.input.appCredId) throw new Error('App credential ID is required');

    if (ctx.input.action === 'get') {
      let result = await client.getAppCred(
        ctx.input.consortiumId,
        ctx.input.environmentId,
        ctx.input.appCredId
      );
      return {
        output: {
          appCredId: result._id,
          name: result.name,
          membershipId: result.membership_id,
          authType: result.auth_type
        },
        message: `App credential \`${result._id}\` — membership: ${result.membership_id || 'unknown'}.`
      };
    }

    // delete
    await client.deleteAppCred(
      ctx.input.consortiumId,
      ctx.input.environmentId,
      ctx.input.appCredId
    );
    return {
      output: {
        appCredId: ctx.input.appCredId,
        deleted: true
      },
      message: `Deleted app credential \`${ctx.input.appCredId}\`.`
    };
  })
  .build();
