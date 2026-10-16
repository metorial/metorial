import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { appIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateUserAliases = SlateTool.create(spec, {
  name: 'Update User Aliases',
  key: 'update_user_aliases',
  description:
    'Add or update external_id or custom aliases for an existing user. Use appId from list_apps with an Organization API Key, or Settings > Keys & IDs. Set an external_id before adding custom aliases. Conflicting aliases fail without merging users.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      appId: appIdSchema,
      aliasLabel: z
        .string()
        .default('external_id')
        .describe('Existing alias label identifying the user'),
      aliasId: z.string().describe('Existing alias value identifying the user'),
      identity: z
        .record(z.string(), z.string())
        .describe(
          'Aliases to set, for example {"external_id":"user-123","crm_id":"contact-42"}'
        )
    })
  )
  .output(
    z.object({ identity: z.record(z.string(), z.string()).describe('Updated user identity') })
  )
  .handleInvocation(async ctx => {
    let aliases = Object.entries(ctx.input.identity);
    if (
      !aliases.length ||
      aliases.some(
        ([label, value]) => !label || !value || label.length > 128 || value.length > 128
      )
    ) {
      throw createApiServiceError(
        'Provide non-empty alias labels and values of at most 128 characters.'
      );
    }
    if ('onesignal_id' in ctx.input.identity)
      throw createApiServiceError(
        'onesignal_id is assigned by OneSignal and cannot be changed.'
      );
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.input.appId ?? ctx.config.appId
    });
    let result = await client.updateUserIdentity(
      ctx.input.aliasLabel,
      ctx.input.aliasId,
      ctx.input.identity
    );
    return {
      output: { identity: result.identity },
      message: `Updated aliases for user **${ctx.input.aliasId}**.`
    };
  })
  .build();

export let deleteUserAlias = SlateTool.create(spec, {
  name: 'Delete User Alias',
  key: 'delete_user_alias',
  description:
    'Remove an external_id or custom alias while retaining the user and subscriptions. The permanent onesignal_id cannot be removed. Use appId from list_apps with an Organization API Key, or Settings > Keys & IDs.',
  tags: { destructive: true }
})
  .input(
    z.object({
      appId: appIdSchema,
      aliasLabel: z
        .string()
        .default('external_id')
        .describe('Existing alias label identifying the user'),
      aliasId: z.string().describe('Existing alias value identifying the user'),
      aliasLabelToDelete: z.string().describe('Alias label to remove')
    })
  )
  .output(
    z.object({
      identity: z.record(z.string(), z.string()).describe('Remaining user identity')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.aliasLabelToDelete === 'onesignal_id')
      throw createApiServiceError('The permanent onesignal_id cannot be removed.');
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.input.appId ?? ctx.config.appId
    });
    let result = await client.deleteUserAlias(
      ctx.input.aliasLabel,
      ctx.input.aliasId,
      ctx.input.aliasLabelToDelete
    );
    return {
      output: { identity: result.identity },
      message: `Removed alias **${ctx.input.aliasLabelToDelete}** from user **${ctx.input.aliasId}**.`
    };
  })
  .build();
