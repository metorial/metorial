import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a contact by its ID from Salesmate. Returns all fields including custom fields for the specified contact.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contact: z
        .record(z.string(), z.unknown())
        .describe('Full contact record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getContact(ctx.input.contactId);
    let contact = result?.Data ?? result;

    return {
      output: { contact },
      message: `Retrieved contact \`${ctx.input.contactId}\`.`
    };
  })
  .build();
