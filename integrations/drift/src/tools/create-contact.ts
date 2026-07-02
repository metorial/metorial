import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in Drift. Requires at least an email address. You can also set custom attributes and an external ID for integration with other systems.`,
  instructions: [
    'The email attribute is required for creating a contact.',
    'If no externalId is provided, duplicate emails will be rejected.'
  ]
})
  .input(
    z.object({
      email: z.string().describe('Email address for the new contact'),
      name: z.string().optional().describe('Full name of the contact'),
      phone: z.string().optional().describe('Phone number of the contact'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier to link the contact to another system'),
      customAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom attributes as key-value pairs')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('Drift ID of the created contact'),
      createdAt: z.number().optional().describe('Unix timestamp of contact creation'),
      attributes: z.record(z.string(), z.any()).optional().describe('Contact attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    let attributes: Record<string, any> = {
      email: ctx.input.email,
      ...ctx.input.customAttributes
    };

    if (ctx.input.name) attributes.name = ctx.input.name;
    if (ctx.input.phone) attributes.phone = ctx.input.phone;
    if (ctx.input.externalId) attributes.externalId = ctx.input.externalId;

    let contact = await client.createContact(attributes);

    return {
      output: {
        contactId: contact.id,
        createdAt: contact.createdAt,
        attributes: contact.attributes
      },
      message: `Created contact **${ctx.input.email}** with ID \`${contact.id}\`.`
    };
  })
  .build();
