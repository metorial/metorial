import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredFieldError, slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import type { SlackPresence } from '../lib/types';
import { spec } from '../spec';

let presenceScopes = {
  AND: [
    {
      OR: [
        ...slackActionScopes.presenceRead.AND.flatMap(clause => clause.OR),
        ...slackActionScopes.presenceWrite.AND.flatMap(clause => clause.OR)
      ]
    }
  ]
};

let presenceInfoSchema = z.object({
  presence: z.enum(['active', 'away']).optional().describe('Current Slack presence'),
  online: z.boolean().optional().describe('Whether the user is currently online'),
  autoAway: z.boolean().optional().describe('Whether Slack automatically set away'),
  manualAway: z.boolean().optional().describe('Whether presence was manually set away'),
  connectionCount: z.number().optional().describe('Number of active Slack connections'),
  lastActivity: z.number().optional().describe('Unix timestamp of the last activity')
});

let mapPresence = (presence: SlackPresence) => ({
  presence: presence.presence,
  online: presence.online,
  autoAway: presence.auto_away,
  manualAway: presence.manual_away,
  connectionCount: presence.connection_count,
  lastActivity: presence.last_activity
});

export let managePresence = SlateTool.create(spec, {
  name: 'Manage Presence',
  key: 'manage_presence',
  description:
    'Read a Slack user presence or set the connected actor presence to automatic or away. Get requires users:read; set requires users:write.',
  constraints: [
    'Set always affects only the actor represented by the connected token and does not accept a target user ID.',
    'userId is supported only for get; presence is required only for set.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(presenceScopes)
  .input(
    z.object({
      action: z.enum(['get', 'set']).describe('Presence action to perform'),
      userId: z
        .string()
        .min(1)
        .optional()
        .describe('User ID to read for get; omit to read the connected actor'),
      presence: z
        .enum(['auto', 'away'])
        .optional()
        .describe('Presence mode required for set: auto or away')
    })
  )
  .output(
    z.object({
      action: z.enum(['get', 'set']).describe('Completed presence action'),
      userId: z.string().optional().describe('User whose presence was read'),
      presence: presenceInfoSchema.optional().describe('Presence details returned by Slack'),
      requestedPresence: z
        .enum(['auto', 'away'])
        .optional()
        .describe('Presence mode submitted for set'),
      updated: z.boolean().describe('Whether Slack accepted the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);

    if (ctx.input.action === 'get') {
      if (ctx.input.presence !== undefined) {
        throw slackServiceError('presence can only be used with set action');
      }
      let presence = await client.getPresence(ctx.input.userId);
      return {
        output: {
          action: ctx.input.action,
          userId: ctx.input.userId,
          presence: mapPresence(presence),
          updated: true
        },
        message: `Retrieved Slack presence${ctx.input.userId ? ` for user \`${ctx.input.userId}\`` : ' for the connected actor'}.`
      };
    }

    if (ctx.input.userId !== undefined) {
      throw slackServiceError('userId cannot be used with set action');
    }
    if (ctx.input.presence === undefined) {
      throw missingRequiredFieldError('presence', 'set action');
    }

    await client.setPresence(ctx.input.presence);
    return {
      output: {
        action: ctx.input.action,
        requestedPresence: ctx.input.presence,
        updated: true
      },
      message: `Set the connected Slack actor presence to ${ctx.input.presence}.`
    };
  })
  .build();
