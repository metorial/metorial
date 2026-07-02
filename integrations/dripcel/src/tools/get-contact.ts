import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Look up a single contact by their cell number (MSISDN). Returns the contact's profile including custom fields, tags, and opt-out status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cell: z.string().describe('Cell number (MSISDN) of the contact to look up')
    })
  )
  .output(
    z.object({
      contact: z.any().describe('The contact record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getContact(ctx.input.cell);
    return {
      output: { contact: result.data },
      message: `Found contact **${ctx.input.cell}**.`
    };
  })
  .build();
