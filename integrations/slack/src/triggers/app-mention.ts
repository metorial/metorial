import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { slackEventsTriggerGroup } from './eventsTriggerGroup';

let slackAppMentionEvent = z
  .object({
    type: z.literal('app_mention'),
    channel: z.string(),
    ts: z.string(),
    user: z.string().optional(),
    text: z.string().optional(),
    thread_ts: z.string().optional()
  })
  .loose();

export let appMentioned = SlateTrigger.create(spec, {
  name: 'App Mentioned',
  key: 'app_mentioned',
  description:
    'Triggers when someone mentions the connected app (e.g. `@YourApp`) in a channel it is a member of.'
})
  .scopes(slackActionScopes.appMentionEvents)
  .triggerGroup(slackEventsTriggerGroup)
  .input(slackAppMentionEvent)
  .output(
    z.object({
      messageTs: z.string().describe('Message timestamp'),
      channelId: z.string().describe('Channel ID where the mention occurred'),
      text: z.string().optional().describe('Message text'),
      userId: z.string().optional().describe('User ID of the person who mentioned the app'),
      threadTs: z.string().optional().describe('Thread parent timestamp')
    })
  )
  .matches(payload => {
    let event = payload as { type?: unknown; ts?: unknown; channel?: unknown };
    return !!event && event.type === 'app_mention' && typeof event.ts === 'string' && typeof event.channel === 'string';
  })
  .map(async ctx => {
    let event = ctx.input;

    return {
      type: 'app_mention',
      id: `${event.channel}-${event.ts}`,
      output: {
        messageTs: event.ts,
        channelId: event.channel,
        text: event.text,
        userId: event.user,
        threadTs: event.thread_ts
      }
    };
  })
  .build();
