import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContactLogTool = SlateTool.create(spec, {
  name: 'Create Contact Log',
  key: 'create_contact_log',
  description: `Log a communication interaction for a contact. Record phone calls, SMS messages, emails, and other interactions with a date and optional description.`,
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
        .describe('Type of communication (e.g. "Phone Call", "SMS", "Email")'),
      date: z.string().optional().describe('Date of the interaction in YYYY-MM-DD format'),
      description: z.string().optional().describe('Description or notes about the interaction')
    })
  )
  .output(
    z.object({
      log: z.record(z.string(), z.any()).describe('The created log entry')
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
