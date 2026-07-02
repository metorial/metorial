import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let trackLead = SlateTool.create(spec, {
  name: 'Track Lead',
  key: 'track_lead',
  description: `Track a lead conversion event attributed to a link click. Requires the click ID (obtained from the \`dub_id\` cookie) and a customer identifier. Use this when a user performs a significant action like signing up.`,
  instructions: [
    'The clickId comes from the dub_id cookie set when a user clicks a Dub link',
    "customerExternalId should be your own system's user/customer ID"
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      clickId: z.string().describe('Unique click ID from the dub_id cookie'),
      eventName: z.string().describe('Name of the lead event (e.g., "Sign up", "Free trial")'),
      customerExternalId: z.string().describe("Your system's unique customer ID"),
      customerName: z.string().optional().describe('Customer display name'),
      customerEmail: z.string().optional().describe('Customer email address'),
      customerAvatar: z.string().optional().describe('Customer avatar URL'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional event metadata')
    })
  )
  .output(
    z.object({
      clickId: z.string().describe('The attributed click ID'),
      linkId: z.string().describe('The attributed link ID'),
      shortLink: z.string().describe('The attributed short link'),
      customerName: z.string().nullable().describe('Customer name'),
      customerEmail: z.string().nullable().describe('Customer email'),
      customerExternalId: z.string().nullable().describe('Customer external ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.trackLead({
      clickId: ctx.input.clickId,
      eventName: ctx.input.eventName,
      customerExternalId: ctx.input.customerExternalId,
      customerName: ctx.input.customerName,
      customerEmail: ctx.input.customerEmail,
      customerAvatar: ctx.input.customerAvatar,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        clickId: result.click.id,
        linkId: result.link.id,
        shortLink: result.link.shortLink,
        customerName: result.customer.name,
        customerEmail: result.customer.email,
        customerExternalId: result.customer.externalId
      },
      message: `Tracked lead event **"${ctx.input.eventName}"** for customer \`${ctx.input.customerExternalId}\``
    };
  })
  .build();
