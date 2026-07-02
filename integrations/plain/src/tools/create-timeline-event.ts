import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let componentSchema = z.object({
  componentText: z
    .object({
      text: z.string().describe('Text content')
    })
    .optional(),
  componentSpacer: z
    .object({
      spacerSize: z.enum(['XS', 'S', 'M', 'L', 'XL']).describe('Spacer size')
    })
    .optional(),
  componentLinkButton: z
    .object({
      linkButtonLabel: z.string().describe('Button label'),
      linkButtonUrl: z.string().describe('Button URL')
    })
    .optional()
});

export let createTimelineEvent = SlateTool.create(spec, {
  name: 'Create Timeline Event',
  key: 'create_timeline_event',
  description: `Create a custom event on a customer's timeline or on a specific thread. Timeline events appear in the thread view and can display rich content (text, links, spacers). Use **externalId** for idempotency.`,
  instructions: [
    "Provide customerId to create an event on all of a customer's threads.",
    'Provide threadId to target a specific thread.',
    'Use externalId for idempotent event creation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().optional().describe('Customer ID (for customer-level events)'),
      threadId: z.string().optional().describe('Thread ID (for thread-level events)'),
      title: z.string().describe('Event title'),
      components: z.array(componentSchema).describe('UI components for the event'),
      externalId: z.string().optional().describe('External ID for idempotency')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Created event ID'),
      title: z.string().describe('Event title'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.threadId) {
      let input: any = {
        threadId: ctx.input.threadId,
        title: ctx.input.title,
        components: ctx.input.components
      };
      if (ctx.input.externalId) {
        input.externalId = ctx.input.externalId;
      }

      let res = await client.createThreadEvent(input);
      let ev = res.threadEvent;

      return {
        output: {
          eventId: ev.id,
          title: ev.title,
          createdAt: ev.createdAt?.iso8601
        },
        message: `Thread event created: **${ev.title}**`
      };
    } else if (ctx.input.customerId) {
      let input: any = {
        customerIdentifier: { customerId: ctx.input.customerId },
        title: ctx.input.title,
        components: ctx.input.components
      };
      if (ctx.input.externalId) {
        input.externalId = ctx.input.externalId;
      }

      let res = await client.createCustomerEvent(input);
      let ev = res.customerEvent;

      return {
        output: {
          eventId: ev.id,
          title: ev.title,
          createdAt: ev.createdAt?.iso8601
        },
        message: `Customer event created: **${ev.title}**`
      };
    } else {
      throw new Error('Provide either customerId or threadId');
    }
  })
  .build();
