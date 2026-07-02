import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let getPhonebookFields = SlateTool.create(spec, {
  name: 'Get Phonebook Fields',
  key: 'get_phonebook_fields',
  description: `Retrieve the available phonebook fields configured in MSG91 Segmento. Use this to discover which fields are available when creating or updating contacts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      fields: z.any().describe('Available phonebook fields and their configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.getPhonebookFields();

    return {
      output: { fields: result },
      message: `Retrieved phonebook fields.`
    };
  })
  .build();
