import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReportingClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieves the full customer journey and details for a single contact from SegMetrics.
Returns contact information including name, email, status, custom fields, and optionally their events, tags, orders, subscriptions, and list memberships.`,
  instructions: [
    'Use extend to request additional data: events, tags, orders, subscriptions, lists.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      contactIdOrEmail: z.string().describe('The contact ID or email address to look up.'),
      extend: z
        .array(z.enum(['events', 'tags', 'orders', 'subscriptions', 'lists']))
        .optional()
        .describe('Additional data dimensions to include.')
    })
  )
  .output(
    z.object({
      contact: z
        .unknown()
        .describe('Full contact data including journey, attribution, and extended data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReportingClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let contact = await client.getContact({
      contactIdOrEmail: ctx.input.contactIdOrEmail,
      extend: ctx.input.extend
    });

    return {
      output: {
        contact
      },
      message: `Retrieved contact data for **${ctx.input.contactIdOrEmail}**.`
    };
  })
  .build();
