import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { HeapClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Submit a user or batch of users for deletion from all environments in your Heap account.
Returns a deletion request ID and status. Deletion is asynchronous; call get_deletion_status until the request is complete.`,
  instructions: [
    'Provide exactly one of **identity** or **userId** for a single user, or use **users** for a batch.',
    'Use **requestId** with get_deletion_status to confirm completion. **deleted** is true only when Heap reports complete.',
    'This operation is irreversible — all user data will be permanently removed.'
  ],
  constraints: [
    'Requires the Main Production environment App ID and API Key for authentication.',
    'Maximum 10,000 users per request.',
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
      userId: z.string().optional().describe('The Heap user ID of the user to delete.'),
      users: z
        .array(
          z.object({
            identity: z
              .string()
              .optional()
              .describe('Known user identity. Provide exactly one of identity or userId.'),
            userId: z
              .string()
              .optional()
              .describe('Heap user ID. Provide exactly one of userId or identity.')
          })
        )
        .optional()
        .describe(
          'Users to delete in bulk, up to 10,000. Omit the top-level identity and userId.'
        )
    })
  )
  .output(
    z.object({
      deleted: z
        .boolean()
        .describe('Whether Heap reports that the deletion request is complete.'),
      requestId: z.string().describe('Deletion request ID to pass to get_deletion_status.'),
      status: z
        .string()
        .describe('Deletion request status returned by Heap, such as pending or complete.'),
      requestLocation: z
        .string()
        .optional()
        .describe('Provider URL for the deletion request status, when returned.')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.users !== undefined &&
      (ctx.input.identity !== undefined || ctx.input.userId !== undefined)
    ) {
      throw createApiServiceError(
        'Provide users for bulk deletion or a top-level identity or userId for a single user, not both.'
      );
    }

    let client = new HeapClient({
      appId: ctx.auth.appId,
      apiKey: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let users = ctx.input.users ?? [
      { identity: ctx.input.identity, userId: ctx.input.userId }
    ];
    ctx.info(`Submitting ${users.length} users for deletion`);
    let result = await client.deleteUsers(users);

    return {
      output: result,
      message: result.deleted
        ? `Heap deletion request **${result.requestId}** is complete.`
        : `Heap accepted deletion request **${result.requestId}**. Status: **${result.status}**. Use get_deletion_status to confirm completion.`
    };
  })
  .build();
