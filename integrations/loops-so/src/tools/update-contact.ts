import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact or create a new one (upsert). Identify the contact by email or user ID. All provided fields will be updated; omitted fields remain unchanged. Can also manage mailing list subscriptions and set custom properties.`,
  instructions: [
    'Provide either email or userId to identify the contact. If both are provided, the system matches on either value.',
    'To reset a property value, pass null for that property in customProperties.',
    'To change a contact email, the contact must have a userId set.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address of the contact'),
      userId: z.string().optional().describe('External user ID of the contact'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      source: z.string().optional().describe('Updated source'),
      subscribed: z
        .boolean()
        .optional()
        .describe(
          'Updated subscription status. Setting to true will re-subscribe previously unsubscribed contacts.'
        ),
      userGroup: z.string().optional().describe('Updated user group'),
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
          'Custom contact properties to update as key-value pairs. Send null to reset a property.'
        )
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the updated or created contact'),
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { customProperties, ...standardFields } = ctx.input;
    let data = { ...standardFields, ...customProperties };

    let result = await client.updateContact(data);

    let identifier = ctx.input.email || ctx.input.userId || 'unknown';
    return {
      output: {
        contactId: result.id,
        success: result.success
      },
      message: `Updated contact **${identifier}** (ID: \`${result.id}\`).`
    };
  })
  .build();
