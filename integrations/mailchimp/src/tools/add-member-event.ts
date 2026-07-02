import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { getSubscriberHash } from '../lib/helpers';
import { spec } from '../spec';

export let addMemberEventTool = SlateTool.create(spec, {
  name: 'Add Member Event',
  key: 'add_member_event',
  description: `Post a custom event for a list member. Custom events can trigger automations and Customer Journeys. Provide the event name and optional key-value properties.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('Audience ID'),
      emailAddress: z.string().describe('Email address of the member'),
      eventName: z
        .string()
        .describe('Name of the custom event (e.g., "purchased_product", "viewed_page")'),
      properties: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value properties for the event')
    })
  )
  .output(
    z.object({
      subscriberHash: z.string(),
      emailAddress: z.string(),
      eventName: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let hash = getSubscriberHash(ctx.input.emailAddress);

    await client.addMemberEvent(ctx.input.listId, hash, {
      name: ctx.input.eventName,
      properties: ctx.input.properties
    });

    return {
      output: {
        subscriberHash: hash,
        emailAddress: ctx.input.emailAddress,
        eventName: ctx.input.eventName,
        success: true
      },
      message: `Event **${ctx.input.eventName}** posted for **${ctx.input.emailAddress}**.`
    };
  })
  .build();
