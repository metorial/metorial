import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSubscriberTags = SlateTool.create(spec, {
  name: 'Manage Subscriber Tags',
  key: 'manage_subscriber_tags',
  description: `Add or remove tags from a subscriber. Provide the subscriber UUID and the list of tag names to add or remove.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove tags'),
      subscriberUuid: z.string().describe('UUID of the subscriber'),
      tags: z.array(z.string()).min(1).describe('Tag names to add or remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'add') {
      await client.addTagsToSubscriber(ctx.input.subscriberUuid, ctx.input.tags);
    } else {
      await client.removeTagsFromSubscriber(ctx.input.subscriberUuid, ctx.input.tags);
    }

    return {
      output: { success: true },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} tags **${ctx.input.tags.join(', ')}** ${ctx.input.action === 'add' ? 'to' : 'from'} subscriber.`
    };
  });
