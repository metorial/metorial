import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { driftServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing Drift contact's attributes. Supports updating standard fields like name, email, phone, as well as any custom attributes.`
})
  .input(
    z.object({
      contactId: z.string().describe('Drift contact ID to update'),
      email: z.string().optional().describe('Updated email address'),
      name: z.string().optional().describe('Updated name'),
      phone: z.string().optional().describe('Updated phone number'),
      customAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom attributes to update as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Drift contact ID'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated contact attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    let attributes: Record<string, any> = {
      ...ctx.input.customAttributes
    };

    if (ctx.input.email) attributes.email = ctx.input.email;
    if (ctx.input.name) attributes.name = ctx.input.name;
    if (ctx.input.phone) attributes.phone = ctx.input.phone;

    if (Object.keys(attributes).length === 0) {
      throw driftServiceError(
        'At least one contact attribute is required to update a contact.'
      );
    }

    let contact = await client.updateContact(ctx.input.contactId, attributes);

    return {
      output: {
        contactId: contact.id,
        attributes: contact.attributes
      },
      message: `Updated contact \`${ctx.input.contactId}\`.`
    };
  })
  .build();
