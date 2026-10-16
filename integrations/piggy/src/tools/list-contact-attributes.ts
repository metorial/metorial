import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContactAttributes = SlateTool.create(spec, {
  name: 'List Contact Attributes',
  key: 'list_contact_attributes',
  description:
    'Discover contact attribute names and data types before updating contact attributes.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      attributes: z
        .array(z.record(z.string(), z.any()))
        .describe('Unmodified provider attribute definitions')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listContactAttributes('contact');
    return {
      output: { attributes: result.data },
      message: `Retrieved ${result.data.length} contact attribute definitions.`
    };
  })
  .build();
