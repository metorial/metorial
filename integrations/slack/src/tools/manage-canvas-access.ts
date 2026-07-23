import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

type SlackCanvasAccessLevel = 'read' | 'write' | 'owner';

type ManageCanvasAccessInput = {
  action: 'set' | 'delete';
  accessLevel?: SlackCanvasAccessLevel;
  userIds?: string[];
  channelIds?: string[];
};

type ValidatedCanvasAccessInput =
  | {
      action: 'set';
      accessLevel: SlackCanvasAccessLevel;
      targetType: 'users' | 'channels';
      targetIds: string[];
    }
  | {
      action: 'delete';
      targetType: 'users' | 'channels';
      targetIds: string[];
    };

let validateManageCanvasAccess = (
  input: ManageCanvasAccessInput
): ValidatedCanvasAccessInput => {
  let hasUserIds = input.userIds !== undefined;
  let hasChannelIds = input.channelIds !== undefined;

  if (hasUserIds === hasChannelIds) {
    throw slackServiceError('Provide exactly one of userIds or channelIds.');
  }

  if (input.action === 'set') {
    if (input.accessLevel === undefined) {
      throw slackServiceError('accessLevel is required when action is set.');
    }

    return {
      action: input.action,
      accessLevel: input.accessLevel,
      targetType: hasUserIds ? ('users' as const) : ('channels' as const),
      targetIds: input.userIds ?? input.channelIds ?? []
    };
  }

  if (input.accessLevel !== undefined) {
    throw slackServiceError('accessLevel is not supported when action is delete.');
  }

  return {
    action: input.action,
    targetType: hasUserIds ? ('users' as const) : ('channels' as const),
    targetIds: input.userIds ?? input.channelIds ?? []
  };
};

export let manageCanvasAccess = SlateTool.create(spec, {
  name: 'Manage Canvas Access',
  key: 'manage_canvas_access',
  description:
    'Set or revoke access to a Slack Canvas for an explicit collection of users or channels.',
  instructions: [
    'Use set with accessLevel and exactly one of userIds or channelIds.',
    "Use delete with exactly one of userIds or channelIds to revoke those targets' Canvas access.",
    'Use explicit Slack user IDs or channel IDs; do not mix user and channel targets in one call.'
  ],
  constraints: [
    'The delete action revokes access and can prevent users or channel members from opening the Canvas.',
    'The connected Slack identity must be allowed to manage access to the Canvas.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(slackActionScopes.canvasesWrite)
  .input(
    z.object({
      action: z.enum(['set', 'delete']).describe('Whether to set or revoke Canvas access'),
      canvasId: z.string().trim().min(1).describe('Slack Canvas ID whose access will change'),
      accessLevel: z
        .enum(['read', 'write', 'owner'])
        .optional()
        .describe('Slack Canvas access level; required only when action is set'),
      userIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .optional()
        .describe('User IDs to grant or revoke; provide exactly one target collection'),
      channelIds: z
        .array(z.string().trim().min(1))
        .min(1)
        .optional()
        .describe('Channel IDs to grant or revoke; provide exactly one target collection')
    })
  )
  .output(
    z.object({
      canvasId: z.string().describe('Slack Canvas ID whose access changed'),
      action: z.enum(['set', 'delete']).describe('Completed access action'),
      targetType: z.enum(['users', 'channels']).describe('Type of target collection changed'),
      targetCount: z.number().int().nonnegative().describe('Number of access targets changed'),
      accessLevel: z
        .enum(['read', 'write', 'owner'])
        .optional()
        .describe('Access level applied by the set action')
    })
  )
  .handleInvocation(async ctx => {
    let validatedInput = validateManageCanvasAccess(ctx.input);

    let client = new SlackClient(ctx.auth.token);
    if (validatedInput.action === 'set') {
      await client.setCanvasAccess({
        canvasId: ctx.input.canvasId,
        accessLevel: validatedInput.accessLevel,
        userIds: validatedInput.targetType === 'users' ? validatedInput.targetIds : undefined,
        channelIds:
          validatedInput.targetType === 'channels' ? validatedInput.targetIds : undefined
      });
    } else {
      await client.deleteCanvasAccess({
        canvasId: ctx.input.canvasId,
        userIds: validatedInput.targetType === 'users' ? validatedInput.targetIds : undefined,
        channelIds:
          validatedInput.targetType === 'channels' ? validatedInput.targetIds : undefined
      });
    }

    let targetCount = validatedInput.targetIds.length;

    return {
      output: {
        canvasId: ctx.input.canvasId,
        action: validatedInput.action,
        targetType: validatedInput.targetType,
        targetCount,
        accessLevel: validatedInput.action === 'set' ? validatedInput.accessLevel : undefined
      },
      message:
        validatedInput.action === 'set'
          ? `Set \`${validatedInput.accessLevel}\` access to Slack Canvas \`${ctx.input.canvasId}\` for ${targetCount} ${validatedInput.targetType}.`
          : `Revoked access to Slack Canvas \`${ctx.input.canvasId}\` for ${targetCount} ${validatedInput.targetType}.`
    };
  })
  .build();
