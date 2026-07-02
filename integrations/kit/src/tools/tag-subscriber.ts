import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import { spec } from '../spec';

export let tagSubscriber = SlateTool.create(spec, {
  name: 'Tag Subscriber',
  key: 'tag_subscriber',
  description: `Add or remove a tag from a subscriber. You can identify the subscriber by their ID or email address. Tags enable targeted campaigns and trigger automations.`
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the tag'),
      tagId: z.number().describe('The tag ID to add or remove'),
      subscriberId: z
        .number()
        .optional()
        .describe('Subscriber ID (provide either this or emailAddress)'),
      emailAddress: z
        .string()
        .optional()
        .describe('Subscriber email address (provide either this or subscriberId)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.subscriberId && !ctx.input.emailAddress) {
      throw kitServiceError('Provide either subscriberId or emailAddress');
    }

    if (ctx.input.action === 'add') {
      if (ctx.input.subscriberId) {
        await client.tagSubscriber(ctx.input.tagId, ctx.input.subscriberId);
      } else {
        await client.tagSubscriberByEmail(ctx.input.tagId, ctx.input.emailAddress!);
      }
      return {
        output: { success: true },
        message: `Added tag \`${ctx.input.tagId}\` to subscriber.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (ctx.input.subscriberId) {
        await client.removeTagFromSubscriber(ctx.input.tagId, ctx.input.subscriberId);
      } else {
        await client.removeTagFromSubscriberByEmail(ctx.input.tagId, ctx.input.emailAddress!);
      }
      return {
        output: { success: true },
        message: `Removed tag \`${ctx.input.tagId}\` from subscriber.`
      };
    }

    throw kitServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
