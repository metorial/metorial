import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScimClient } from '../lib/client';
import { spec } from '../spec';

export let deprovisionScimUser = SlateTool.create(spec, {
  name: 'Deprovision SCIM User',
  key: 'deprovision_scim_user',
  description: `Deactivates or deletes a provisioned user from an InVision Enterprise account via the SCIM API.
By default, the user is deactivated (soft removal). Set **permanentDelete** to true to permanently remove the user record.

**Note:** InVision was shut down on December 31, 2024. This tool will only work if the service is still accessible.`,
  constraints: ['Permanent deletion cannot be undone. Use deactivation when possible.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      scimBaseUrl: z
        .string()
        .describe('The SCIM API base URL (e.g., https://team.invisionapp.com/scim/v2)'),
      userId: z.string().describe('The SCIM user ID of the user to deprovision'),
      permanentDelete: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, permanently deletes the user instead of deactivating')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('SCIM user ID of the deprovisioned user'),
      action: z.enum(['deactivated', 'deleted']).describe('The action that was taken')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScimClient({
      token: ctx.auth.token,
      scimBaseUrl: ctx.input.scimBaseUrl
    });

    if (ctx.input.permanentDelete) {
      await client.deleteUser(ctx.input.userId);
      return {
        output: {
          userId: ctx.input.userId,
          action: 'deleted' as const
        },
        message: `Permanently deleted user with SCIM ID \`${ctx.input.userId}\`.`
      };
    } else {
      await client.deactivateUser(ctx.input.userId);
      return {
        output: {
          userId: ctx.input.userId,
          action: 'deactivated' as const
        },
        message: `Deactivated user with SCIM ID \`${ctx.input.userId}\`.`
      };
    }
  })
  .build();
