import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactPersonInputSchema, contactPersonOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let upsertContactPerson = SlateTool.create(spec, {
  name: 'Create or Update Contact Person',
  key: 'upsert_contact_person',
  description: `Create a new contact person for a customer or update an existing one. Each contact person has their own external ID, name, email, and phone details. Multiple contact persons can exist per customer to receive different payment reminders.`,
  instructions: [
    'The customerId can be an internal Chaser ID or "ext_{externalId}" for the parent customer.',
    'To update, provide the contactPersonId (the contact person external ID). To create, omit it.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z
        .string()
        .describe('Internal Chaser customer ID or "ext_{externalId}" of the parent customer'),
      contactPersonId: z
        .string()
        .optional()
        .describe(
          'External ID of the contact person to update. Omit to create a new contact person.'
        ),
      contactPerson: contactPersonInputSchema.describe('Contact person data')
    })
  )
  .output(contactPersonOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.contactPersonId) {
      result = await client.updateContactPerson(
        ctx.input.customerId,
        ctx.input.contactPersonId,
        ctx.input.contactPerson
      );
    } else {
      result = await client.createContactPerson(ctx.input.customerId, ctx.input.contactPerson);
    }

    let output = {
      externalId: result.externalId || '',
      contactFirstName: result.contactFirstName ?? null,
      contactLastName: result.contactLastName ?? null,
      contactEmailAddress: result.contactEmailAddress ?? null,
      phoneNumber: result.phoneNumber ?? null,
      mobileNumber: result.mobileNumber ?? null,
      status: result.status
    };

    let action = ctx.input.contactPersonId ? 'Updated' : 'Created';
    let name =
      [output.contactFirstName, output.contactLastName].filter(Boolean).join(' ') ||
      output.externalId;
    return {
      output,
      message: `${action} contact person **${name}** for customer ${ctx.input.customerId}.`
    };
  })
  .build();
