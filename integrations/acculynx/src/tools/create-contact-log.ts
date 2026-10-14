import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContactLogTool = SlateTool.create(spec, {
  name: 'Create Contact Log',
  key: 'create_contact_log',
  description: `Log a phone call, SMS message, or email for a contact. Provide both a communication type and interaction date. Returns the accepted submitted details; the API does not return a new log ID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The unique ID of the contact'),
      type: z
        .string()
        .optional()
        .describe(
          'Communication type required to submit a log: PhoneCall, Phone Call, SMS, or Email'
        ),
      date: z
        .string()
        .optional()
        .describe(
          'Interaction date required to submit a log: YYYY-MM-DD (midnight UTC) or ISO 8601 timestamp with a timezone'
        ),
      description: z.string().optional().describe('Description or notes about the interaction')
    })
  )
  .output(
    z.object({
      log: z
        .record(z.string(), z.any())
        .describe(
          'Accepted submitted contact ID, communication type, UTC logDate, and description; no provider-generated log ID is returned'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let log = await client.createContactLog(ctx.input.contactId, {
      type: ctx.input.type,
      date: ctx.input.date,
      description: ctx.input.description
    });

    return {
      output: { log },
      message: `Created ${ctx.input.type ?? 'log'} entry for contact **${ctx.input.contactId}**.`
    };
  })
  .build();
