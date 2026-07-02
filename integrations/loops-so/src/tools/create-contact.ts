import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in your Loops audience. Contacts are identified by email address and can include standard properties (name, subscription status, user group) as well as custom properties. Use mailing list subscriptions to add the contact to specific lists on creation.`,
  constraints: [
    'Will return an error if a contact with the same email already exists. Use the Update Contact tool for upsert behavior.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the contact to create'),
      firstName: z.string().optional().describe('First name of the contact'),
      lastName: z.string().optional().describe('Last name of the contact'),
      source: z.string().optional().describe('Source of the contact (defaults to "API")'),
      subscribed: z
        .boolean()
        .optional()
        .describe('Whether the contact is subscribed to campaigns (defaults to true)'),
      userGroup: z.string().optional().describe('User group for segmenting contacts'),
      userId: z.string().optional().describe('External user ID from your application'),
      mailingLists: z
        .record(z.string(), z.boolean())
        .optional()
        .describe(
          'Map of mailing list IDs to subscription status (true to subscribe, false to unsubscribe)'
        ),
      customProperties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Custom contact properties as key-value pairs. Keys must be camelCase and match existing custom property names.'
        )
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the newly created contact'),
      success: z.boolean().describe('Whether the contact was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { customProperties, ...standardFields } = ctx.input;
    let data = { ...standardFields, ...customProperties };

    let result = await client.createContact(data);

    return {
      output: {
        contactId: result.id,
        success: result.success
      },
      message: `Created contact **${ctx.input.email}**${ctx.input.firstName ? ` (${ctx.input.firstName}${ctx.input.lastName ? ` ${ctx.input.lastName}` : ''})` : ''} with ID \`${result.id}\`.`
    };
  })
  .build();
