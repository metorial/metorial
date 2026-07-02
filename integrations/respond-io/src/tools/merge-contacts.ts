import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mergeContacts = SlateTool.create(spec, {
  name: 'Merge Contacts',
  key: 'merge_contacts',
  description: `Merge two contacts into one. The primary contact is retained and the secondary contact's data is merged into it. The secondary contact is removed after the merge.`,
  constraints: [
    'This action is irreversible. The secondary contact will be permanently merged into the primary contact.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      primaryContactId: z.string().describe('ID of the primary contact to keep'),
      secondaryContactId: z
        .string()
        .describe('ID of the secondary contact to merge and remove')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the merged (primary) contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.mergeContacts(
      ctx.input.primaryContactId,
      ctx.input.secondaryContactId
    );
    let data = result?.data || result;

    return {
      output: {
        contactId: String(data?.id || ctx.input.primaryContactId)
      },
      message: `Merged contact **${ctx.input.secondaryContactId}** into **${ctx.input.primaryContactId}**.`
    };
  })
  .build();
