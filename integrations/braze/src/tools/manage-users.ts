import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUsers = SlateTool.create(spec, {
  name: 'Delete Users',
  key: 'delete_users',
  description: `Permanently delete user profiles from Braze by external IDs, Braze IDs, or user aliases. This is irreversible and will remove all data associated with the user profiles.`,
  constraints: [
    'Maximum 50 users per request.',
    'Shares a rate limit of 20,000 requests per minute with other user management endpoints.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      externalIds: z.array(z.string()).optional().describe('External user IDs to delete'),
      brazeIds: z.array(z.string()).optional().describe('Braze internal user IDs to delete'),
      userAliases: z
        .array(
          z.object({
            aliasName: z.string().describe('Alias name'),
            aliasLabel: z.string().describe('Alias label')
          })
        )
        .optional()
        .describe('User aliases to delete')
    })
  )
  .output(
    z.object({
      deleted: z.number().describe('Number of user profiles queued for deletion'),
      message: z.string().describe('Response status from Braze')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.deleteUsers({
      externalIds: ctx.input.externalIds,
      brazeIds: ctx.input.brazeIds,
      userAliases: ctx.input.userAliases
    });

    return {
      output: {
        deleted: result.deleted ?? 0,
        message: result.message
      },
      message: `Queued **${result.deleted ?? 0}** user profile(s) for deletion.`
    };
  })
  .build();

export let mergeUsers = SlateTool.create(spec, {
  name: 'Merge Users',
  key: 'merge_users',
  description: `Merge one user profile into another in Braze. The source user's data is merged into the target user, and the source profile is removed. Useful for deduplicating user profiles.`,
  instructions: [
    'Each merge requires an identifier for the user to keep and the user to merge (remove).',
    'Identifiers can be external_id, user_alias, or braze_id objects.'
  ],
  constraints: [
    'Maximum 50 merge operations per request.',
    'Shares a rate limit of 20,000 requests per minute with other user management endpoints.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      mergeUpdates: z
        .array(
          z.object({
            identifierToKeep: z
              .record(z.string(), z.any())
              .describe(
                'Identifier of the user profile to keep (e.g. { external_id: "keep_id" })'
              ),
            identifierToMerge: z
              .record(z.string(), z.any())
              .describe(
                'Identifier of the user profile to merge and remove (e.g. { external_id: "merge_id" })'
              )
          })
        )
        .describe('List of merge operations to perform')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Response status from Braze'),
      errors: z.array(z.any()).optional().describe('Errors encountered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.mergeUsers(ctx.input.mergeUpdates);

    return {
      output: {
        message: result.message,
        errors: result.errors
      },
      message: `Processed **${ctx.input.mergeUpdates.length}** user merge operation(s).`
    };
  })
  .build();
