import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

const slackListAccessLevelSchema = z.enum(['read', 'write', 'owner']);

type SlackListAccessInput = {
  action: 'set' | 'delete';
  userIds?: string[];
  channelIds?: string[];
  accessLevel?: z.infer<typeof slackListAccessLevelSchema>;
};

let validateSlackListAccessInput = (input: SlackListAccessInput) => {
  let hasUserIds = input.userIds !== undefined;
  let hasChannelIds = input.channelIds !== undefined;

  if (hasUserIds === hasChannelIds) {
    throw slackServiceError('Provide exactly one of userIds or channelIds.');
  }

  if (input.action === 'set' && input.accessLevel === undefined) {
    throw slackServiceError('accessLevel is required for the set action.');
  }

  if (input.action === 'delete' && input.accessLevel !== undefined) {
    throw slackServiceError('accessLevel is not supported for the delete action.');
  }

  if (input.accessLevel === 'owner' && hasChannelIds) {
    throw slackServiceError(
      'The owner access level can only be assigned to users, not channels.'
    );
  }
};

export let manageSlackListAccess = SlateTool.create(spec, {
  name: 'Manage Slack List Access',
  key: 'manage_slack_list_access',
  description:
    'Grant, change, or revoke user or channel access to a Slack List. Each invocation targets either users or channels, never both.',
  instructions: [
    'Use action "set" with accessLevel to grant or change access.',
    'Use action "delete" to revoke access; omit accessLevel for this action.',
    'Provide exactly one non-empty target collection: userIds or channelIds.',
    'The owner access level is valid only for user targets.'
  ],
  constraints: [
    'Deleting access revokes the selected users or channels from the List.',
    'Slack Lists are available only on supported paid Slack plans.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(slackActionScopes.listsWrite)
  .input(
    z.object({
      action: z.enum(['set', 'delete']).describe('Access-management action'),
      listId: z.string().trim().min(1).describe('Slack List ID'),
      userIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .optional()
        .describe('User IDs to grant, change, or revoke; do not combine with channelIds'),
      channelIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .optional()
        .describe('Channel IDs to grant, change, or revoke; do not combine with userIds'),
      accessLevel: slackListAccessLevelSchema
        .optional()
        .describe('Required for set; one of read, write, or owner. Omit for delete')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Slack List ID'),
      action: z.enum(['set', 'delete']).describe('Completed access-management action'),
      accessLevel: slackListAccessLevelSchema
        .optional()
        .describe('Access level assigned by the set action'),
      userIds: z.array(z.string()).optional().describe('Targeted user IDs'),
      channelIds: z.array(z.string()).optional().describe('Targeted channel IDs'),
      targetCount: z.number().int().describe('Number of targeted users or channels')
    })
  )
  .handleInvocation(async ctx => {
    validateSlackListAccessInput(ctx.input);

    let client = new SlackClient(ctx.auth.token);
    if (ctx.input.action === 'set') {
      await client.setSlackListAccess({
        listId: ctx.input.listId,
        accessLevel: ctx.input.accessLevel!,
        userIds: ctx.input.userIds,
        channelIds: ctx.input.channelIds
      });
    } else {
      await client.deleteSlackListAccess({
        listId: ctx.input.listId,
        userIds: ctx.input.userIds,
        channelIds: ctx.input.channelIds
      });
    }

    let targetCount = (ctx.input.userIds ?? ctx.input.channelIds ?? []).length;
    let targetKind = ctx.input.userIds ? 'user' : 'channel';

    return {
      output: {
        listId: ctx.input.listId,
        action: ctx.input.action,
        accessLevel: ctx.input.accessLevel,
        userIds: ctx.input.userIds,
        channelIds: ctx.input.channelIds,
        targetCount
      },
      message:
        ctx.input.action === 'set'
          ? `Set **${ctx.input.accessLevel}** access to Slack List \`${ctx.input.listId}\` for ${targetCount} ${targetKind}(s).`
          : `Revoked access to Slack List \`${ctx.input.listId}\` for ${targetCount} ${targetKind}(s).`
    };
  })
  .build();
