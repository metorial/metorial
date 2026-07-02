import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContactTool = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in your Heyy business account. Contacts represent customers or leads that you communicate with across channels. You can set names, email, phone number, labels, and custom attributes.`,
  constraints: [
    'Custom attribute externalId must start with a letter and contain only alphanumeric characters and underscores.'
  ]
})
  .input(
    z.object({
      firstName: z.string().nullable().optional().describe('First name of the contact'),
      lastName: z.string().nullable().optional().describe('Last name of the contact'),
      email: z
        .string()
        .nullable()
        .optional()
        .describe('Email address (must be valid email format)'),
      phoneNumber: z.string().nullable().optional().describe('Phone number of the contact'),
      labels: z
        .array(
          z.object({
            name: z.string().describe('Label name')
          })
        )
        .optional()
        .describe('Labels to assign to the contact'),
      attributes: z
        .array(
          z.object({
            externalId: z
              .string()
              .describe(
                'Attribute identifier (starts with letter, alphanumeric + underscores only)'
              ),
            value: z.string().describe('Attribute value')
          })
        )
        .optional()
        .describe('Custom attributes for the contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique identifier of the created contact'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      phoneNumber: z.string().nullable().optional().describe('Phone number'),
      email: z.string().nullable().optional().describe('Email address'),
      labels: z.array(z.string()).optional().describe('Assigned labels'),
      attributes: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Custom attributes'),
      createdAt: z.string().optional().describe('When the contact was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let contact = await client.createContact({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      phoneNumber: ctx.input.phoneNumber,
      labels: ctx.input.labels,
      attributes: ctx.input.attributes
    });

    let name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unnamed';

    return {
      output: {
        contactId: contact.id,
        firstName: contact.firstName ?? null,
        lastName: contact.lastName ?? null,
        phoneNumber: contact.phoneNumber ?? null,
        email: contact.email ?? null,
        labels: contact.labels,
        attributes: contact.attributes,
        createdAt: contact.createdAt
      },
      message: `Created contact **${name}** (${contact.id}).`
    };
  })
  .build();
