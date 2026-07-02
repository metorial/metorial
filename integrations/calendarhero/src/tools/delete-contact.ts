import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Remove a contact from CalendarHero. This permanently deletes the contact and cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded'),
      raw: z.any().optional().describe('API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.deleteContact(ctx.input.contactId);

    return {
      output: {
        success: true,
        raw: result
      },
      message: `Contact **${ctx.input.contactId}** deleted.`
    };
  })
  .build();
