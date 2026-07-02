import { SlateTool } from 'slates';
import { z } from 'zod';
import { PendoClient } from '../lib/client';
import { spec } from '../spec';

export let updateAccountMetadata = SlateTool.create(spec, {
  name: 'Update Account Metadata',
  key: 'update_account_metadata',
  description: `Create or update custom metadata fields on an account record in Pendo. If the account does not exist, a new account record will be created with the provided metadata. Custom metadata fields will be automatically created if they don't exist.`,
  instructions: [
    'Metadata keys should use camelCase. The fields will be created as custom metadata in Pendo.',
    'If the account ID does not exist, a new record is created with only the provided metadata.'
  ]
})
  .input(
    z.object({
      accountId: z.string().describe('The unique account ID to update or create'),
      metadata: z
        .record(z.string(), z.any())
        .describe('Key-value pairs of custom metadata to set on the account')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('The account ID that was updated'),
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PendoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.updateAccountMetadata(ctx.input.accountId, ctx.input.metadata);

    return {
      output: {
        accountId: ctx.input.accountId,
        success: true
      },
      message: `Updated metadata for account **${ctx.input.accountId}** with ${Object.keys(ctx.input.metadata).length} field(s).`
    };
  })
  .build();
