import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in Altoviz.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('Altoviz contact ID'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      cellPhone: z.string().optional(),
      title: z.string().optional(),
      internalId: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional()
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Altoviz contact ID'),
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      email: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { contactId, ...updateData } = ctx.input;
    let result = await client.updateContact(contactId, updateData);

    return {
      output: {
        contactId: result.id,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email
      },
      message: `Updated contact **${[result.firstName, result.lastName].filter(Boolean).join(' ')}** (ID: ${result.id}).`
    };
  })
  .build();
