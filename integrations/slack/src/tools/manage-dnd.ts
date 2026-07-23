import { SlateTool } from 'slates';
import { z } from 'zod';
import { slackUserAuthMethods } from '../lib/auth-methods';
import { SlackClient } from '../lib/client';
import {
  missingRequiredFieldError,
  slackServiceError,
  userTokenRequiredError
} from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import type { SlackDndInfo } from '../lib/types';
import { spec } from '../spec';

let dndScopes = {
  AND: [
    {
      OR: [
        ...slackActionScopes.dndRead.AND.flatMap(clause => clause.OR),
        ...slackActionScopes.dndWrite.AND.flatMap(clause => clause.OR)
      ]
    }
  ]
};

let dndInfoSchema = z.object({
  dndEnabled: z.boolean().optional().describe('Whether Do Not Disturb is enabled'),
  nextDndStartTs: z.number().optional().describe('Next scheduled DND start time'),
  nextDndEndTs: z.number().optional().describe('Next scheduled DND end time'),
  snoozeEnabled: z.boolean().optional().describe('Whether a DND snooze is active'),
  snoozeEndTime: z.number().optional().describe('Unix time when the snooze ends'),
  snoozeRemainingMinutes: z.number().optional().describe('Remaining snooze minutes')
});

let mapDndInfo = (info: SlackDndInfo) => ({
  dndEnabled: info.dnd_enabled,
  nextDndStartTs: info.next_dnd_start_ts,
  nextDndEndTs: info.next_dnd_end_ts,
  snoozeEnabled: info.snooze_enabled,
  snoozeEndTime: info.snooze_endtime,
  snoozeRemainingMinutes: info.snooze_remaining
});

export let manageDnd = SlateTool.create(spec, {
  name: 'Manage Do Not Disturb',
  key: 'manage_dnd',
  description:
    'Read Do Not Disturb state or end/set DND for the connected Slack user. Reads require dnd:read; end, end_snooze, and set_snooze require dnd:write.',
  constraints: [
    'DND writes always affect only the connected Slack user.',
    'userId is supported only for get; minutes is required only for set_snooze.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(dndScopes)
  .authMethods(slackUserAuthMethods)
  .input(
    z.object({
      action: z
        .enum(['get', 'end', 'end_snooze', 'set_snooze'])
        .describe('DND action to perform'),
      userId: z
        .string()
        .min(1)
        .optional()
        .describe('User ID to read for get; omit to read the connected user'),
      minutes: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Positive snooze duration in minutes; required for set_snooze')
    })
  )
  .output(
    z.object({
      action: z
        .enum(['get', 'end', 'end_snooze', 'set_snooze'])
        .describe('Completed DND action'),
      userId: z.string().optional().describe('User whose DND state was read'),
      dnd: dndInfoSchema.optional().describe('DND state returned by Slack'),
      completed: z.boolean().describe('Whether Slack accepted the action')
    })
  )
  .handleInvocation(async ctx => {
    let isUserToken =
      ctx.auth.actorType === 'user' || String(ctx.auth.token ?? '').startsWith('xoxp-');
    if (!isUserToken) {
      throw userTokenRequiredError(
        'Slack DND operations require a user token. Use user_oauth or user_token.'
      );
    }

    let client = new SlackClient(ctx.auth.token);

    if (ctx.input.action === 'get') {
      if (ctx.input.minutes !== undefined) {
        throw slackServiceError('minutes can only be used with set_snooze action');
      }

      let info: SlackDndInfo;
      if (ctx.input.userId) {
        let teamInfo = await client.getDndTeamInfo([ctx.input.userId]);
        let users = teamInfo.users as Record<string, SlackDndInfo> | undefined;
        info = users?.[ctx.input.userId] ?? {};
      } else {
        info = await client.getDndInfo();
      }

      return {
        output: {
          action: ctx.input.action,
          userId: ctx.input.userId,
          dnd: mapDndInfo(info),
          completed: true
        },
        message: `Retrieved Slack Do Not Disturb state${ctx.input.userId ? ` for user \`${ctx.input.userId}\`` : ' for the connected user'}.`
      };
    }

    if (ctx.input.userId !== undefined) {
      throw slackServiceError('userId can only be used with get action');
    }

    if (ctx.input.action === 'end') {
      if (ctx.input.minutes !== undefined) {
        throw slackServiceError('minutes can only be used with set_snooze action');
      }
      await client.endDnd();
      return {
        output: { action: ctx.input.action, completed: true },
        message: 'Ended Do Not Disturb for the connected Slack user.'
      };
    }

    if (ctx.input.action === 'end_snooze') {
      if (ctx.input.minutes !== undefined) {
        throw slackServiceError('minutes can only be used with set_snooze action');
      }
      await client.endDndSnooze();
      return {
        output: { action: ctx.input.action, completed: true },
        message: 'Ended the Do Not Disturb snooze for the connected Slack user.'
      };
    }

    if (ctx.input.minutes === undefined) {
      throw missingRequiredFieldError('minutes', 'set_snooze action');
    }

    let info = await client.setDndSnooze(ctx.input.minutes);
    return {
      output: {
        action: ctx.input.action,
        dnd: mapDndInfo(info),
        completed: true
      },
      message: `Set Do Not Disturb for ${ctx.input.minutes} minute(s) for the connected Slack user.`
    };
  })
  .build();
