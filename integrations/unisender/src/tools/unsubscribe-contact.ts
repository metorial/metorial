import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let unsubscribeContact = SlateTool.create(spec, {
  name: 'Unsubscribe Contact',
  key: 'unsubscribe_contact',
  description: `Unsubscribe or exclude a contact from one or more lists. Use **method** "unsubscribe" to mark a contact as unsubscribed (preserves contact data), or "exclude" to completely remove the contact from lists.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      method: z
        .enum(['unsubscribe', 'exclude'])
        .describe('"unsubscribe" marks as opted-out, "exclude" removes from lists entirely'),
      contact: z.string().describe('Email address or phone number of the contact'),
      contactType: z
        .enum(['email', 'phone'])
        .optional()
        .describe('Type of contact identifier'),
      listIds: z
        .array(z.number())
        .optional()
        .describe('Specific list IDs to unsubscribe from. Omit to unsubscribe from all lists.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let params = {
      contact: ctx.input.contact,
      contact_type: ctx.input.contactType,
      list_ids: ctx.input.listIds ? ctx.input.listIds.join(',') : undefined
    };

    if (ctx.input.method === 'unsubscribe') {
      await client.unsubscribe(params);
    } else {
      await client.exclude(params);
    }

    return {
      output: { success: true },
      message: `${ctx.input.method === 'unsubscribe' ? 'Unsubscribed' : 'Excluded'} **${ctx.input.contact}**${ctx.input.listIds ? ` from list(s) \`${ctx.input.listIds.join(', ')}\`` : ' from all lists'}`
    };
  })
  .build();
