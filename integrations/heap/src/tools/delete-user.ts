import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeapClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Delete a user and all their data from your Heap workspace. This checks all environments in your account for a matching user and removes their records.
Primarily used for data privacy compliance (GDPR, CCPA). The user is looked up and then deleted via Heap's SCIM API.`,
  instructions: [
    'Provide either **identity** (e.g., email) or **userId** to identify the user to delete.',
    'This operation is irreversible — all user data will be permanently removed.'
  ],
  constraints: [
    'Requires both App ID and API Key for authentication.',
    'The auth token generated for deletion expires in 5 minutes.',
    'Deletion checks all environments in the account.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      identity: z
        .string()
        .optional()
        .describe('The known identity of the user to delete (e.g., email address).'),
      userId: z.string().optional().describe('The Heap user ID of the user to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the user was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.identity && !ctx.input.userId) {
      throw new Error(
        'Either "identity" or "userId" must be provided to identify the user to delete.'
      );
    }

    let client = new HeapClient({
      appId: ctx.auth.appId,
      apiKey: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let identifier = ctx.input.identity || ctx.input.userId;
    ctx.info(`Deleting user: ${identifier}`);

    await client.deleteUser({
      identity: ctx.input.identity,
      userId: ctx.input.userId
    });

    return {
      output: {
        deleted: true
      },
      message: `Successfully deleted user **"${identifier}"** and all associated data from Heap.`
    };
  })
  .build();
