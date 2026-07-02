import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in eTermin. Provide the contact ID and any fields to update. Omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID (cid) to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated email address'),
      phone: z.string().optional().describe('Updated phone number'),
      salutation: z.string().optional().describe('Updated salutation'),
      title: z.string().optional().describe('Updated title'),
      company: z.string().optional().describe('Updated company name'),
      street: z.string().optional().describe('Updated street address'),
      zip: z.string().optional().describe('Updated postal code'),
      city: z.string().optional().describe('Updated city'),
      state: z.string().optional().describe('Updated state/province'),
      country: z.string().optional().describe('Updated country'),
      birthday: z.string().optional().describe('Updated birthday'),
      customerNumber: z.string().optional().describe('Updated customer number'),
      newsletter: z.string().optional().describe('"1" to subscribe, "0" to unsubscribe'),
      tags: z.string().optional().describe('Comma-separated tags'),
      additional1: z.string().optional().describe('Custom field 1'),
      additional2: z.string().optional().describe('Custom field 2'),
      additional3: z.string().optional().describe('Custom field 3'),
      additional4: z.string().optional().describe('Custom field 4'),
      additional5: z.string().optional().describe('Custom field 5')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('API response with the updated contact details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.updateContact({
      cid: ctx.input.contactId,
      firstname: ctx.input.firstName,
      lastname: ctx.input.lastName,
      email: ctx.input.email,
      phone: ctx.input.phone,
      salutation: ctx.input.salutation,
      title: ctx.input.title,
      company: ctx.input.company,
      street: ctx.input.street,
      zip: ctx.input.zip,
      city: ctx.input.city,
      state: ctx.input.state,
      country: ctx.input.country,
      birthday: ctx.input.birthday,
      customernumber: ctx.input.customerNumber,
      newsletter: ctx.input.newsletter,
      tags: ctx.input.tags,
      additional1: ctx.input.additional1,
      additional2: ctx.input.additional2,
      additional3: ctx.input.additional3,
      additional4: ctx.input.additional4,
      additional5: ctx.input.additional5
    });

    return {
      output: { result },
      message: `Contact **${ctx.input.contactId}** updated.`
    };
  })
  .build();
