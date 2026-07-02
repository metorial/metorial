import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDoNotContacts = SlateTool.create(spec, {
  name: 'List Do Not Contacts',
  key: 'list_do_not_contacts',
  description: `Retrieve the list of phone numbers that have opted out of receiving calls or texts. Each entry shows whether the opt-out applies to calls, texts, or both.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      range: z.string().optional().describe('Pagination range, e.g. "records=201-300"')
    })
  )
  .output(
    z.object({
      doNotContacts: z.array(
        z.object({
          doNotContactId: z.string().optional(),
          phone: z.string().optional(),
          optOutType: z.string().optional().describe('Type of opt-out: call or text'),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let rawList = await client.listDoNotContacts(ctx.input.range);

    let doNotContacts = rawList.map(d => ({
      doNotContactId: d.id,
      phone: d.phone,
      optOutType: d.type,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return {
      output: { doNotContacts },
      message: `Retrieved **${doNotContacts.length}** do-not-contact entries.`
    };
  })
  .build();
