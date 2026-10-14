import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

export let getMessageAnalytics = SlateTool.create(spec, {
  name: 'Get Message Analytics',
  key: 'get_message_analytics',
  description: `Fetch engagement analytics for up to 100 messages. Returns delivery and interaction metrics such as sent, received, read, and clicked timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageIds: z
        .array(z.string())
        .min(1)
        .describe('IDs of the messages to fetch analytics for'),
      limit: z
        .number()
        .optional()
        .describe(
          'Legacy pagination option; this analytics endpoint returns all requested accessible IDs'
        ),
      after: z
        .string()
        .optional()
        .describe('Legacy pagination option; not used by this analytics endpoint'),
      before: z
        .string()
        .optional()
        .describe('Legacy pagination option; not used by this analytics endpoint')
    })
  )
  .output(
    z.object({
      analytics: z.record(z.string(), z.any()).describe('Analytics data keyed by message ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.getMessageAnalytics(ctx.input.messageIds);

    return {
      output: {
        analytics: result
      },
      message: `Retrieved analytics for **${ctx.input.messageIds.length}** message(s).`
    };
  })
  .build();
