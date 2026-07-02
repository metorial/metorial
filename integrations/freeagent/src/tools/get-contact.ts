import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by ID, including all details such as address, billing preferences, and project counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('The FreeAgent contact ID')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.any()).describe('The full contact record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let contact = await client.getContact(ctx.input.contactId);

    return {
      output: { contact },
      message: `Retrieved contact: **${contact.organisation_name || [contact.first_name, contact.last_name].filter(Boolean).join(' ')}**`
    };
  })
  .build();
