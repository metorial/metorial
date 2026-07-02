import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let manageQuest = SlateTool.create(spec, {
  name: 'Manage Quest',
  key: 'manage_quest',
  description: `Manage quests in Habitica. Invite party members to a quest, accept or reject quest invitations, force-start, cancel, or abort an active quest.`,
  instructions: [
    'Use "invite" to start a quest invitation with a quest scroll key.',
    'Use "accept" or "reject" to respond to a pending quest invitation.',
    'Use "force-start" to begin a quest without waiting for all members.',
    'Use "cancel" to cancel a pending quest before it starts.',
    'Use "abort" to end an active quest in progress.',
    'Most quest actions use "party" as the groupId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['invite', 'accept', 'reject', 'force-start', 'cancel', 'abort'])
        .describe('Quest action to perform'),
      groupId: z
        .string()
        .optional()
        .default('party')
        .describe('Group ID (defaults to "party")'),
      questKey: z.string().optional().describe('Quest scroll key (required for invite action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was performed successfully'),
      questKey: z.string().optional().describe('Quest key if applicable'),
      questActive: z.boolean().optional().describe('Whether the quest is now active')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    let groupId = ctx.input.groupId || 'party';

    if (ctx.input.action === 'invite') {
      if (!ctx.input.questKey) throw new Error('questKey is required for invite action');
      let result = await client.inviteToQuest(groupId, ctx.input.questKey);
      return {
        output: {
          success: true,
          questKey: result.key || ctx.input.questKey,
          questActive: result.active
        },
        message: `Invited party to quest **${ctx.input.questKey}**`
      };
    }

    if (ctx.input.action === 'accept') {
      let result = await client.acceptQuest(groupId);
      return {
        output: {
          success: true,
          questKey: result.key,
          questActive: result.active
        },
        message: `Accepted quest invitation`
      };
    }

    if (ctx.input.action === 'reject') {
      let result = await client.rejectQuest(groupId);
      return {
        output: {
          success: true,
          questKey: result.key,
          questActive: result.active
        },
        message: `Rejected quest invitation`
      };
    }

    if (ctx.input.action === 'force-start') {
      let result = await client.forceStartQuest(groupId);
      return {
        output: {
          success: true,
          questKey: result.key,
          questActive: result.active
        },
        message: `Force-started quest`
      };
    }

    if (ctx.input.action === 'cancel') {
      let result = await client.cancelQuest(groupId);
      return {
        output: {
          success: true,
          questKey: result.key,
          questActive: false
        },
        message: `Cancelled pending quest`
      };
    }

    if (ctx.input.action === 'abort') {
      let result = await client.abortQuest(groupId);
      return {
        output: {
          success: true,
          questKey: result.key,
          questActive: false
        },
        message: `Aborted active quest`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
