import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Add, update, or remove a contact from a contact list. When adding a contact, provide at minimum an email address. Supports custom fields (Field1 through Field24).`,
  instructions: [
    'When adding a contact, `emailPermission` should be set to true to indicate the contact has opted in to receive emails.',
    'Custom fields are stored as `field1` through `field24` in the `customFields` object.'
  ]
})
  .input(
    z.object({
      action: z.enum(['add', 'update', 'remove']).describe('Action to perform on the contact'),
      listId: z.string().describe('ID of the contact list'),
      contactId: z
        .string()
        .optional()
        .describe('ID of the contact (required for update and remove)'),
      email: z.string().optional().describe('Contact email address (required for add)'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      middleName: z.string().optional().describe('Contact middle name'),
      emailPermission: z
        .boolean()
        .optional()
        .describe('Whether the contact has opted in to receive emails'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values, keyed as "field1" through "field24"')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      contactId: z.string().optional().describe('ID of the created or updated contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, listId, contactId } = ctx.input;
    let success = false;
    let resultContactId: string | undefined;
    let message = '';

    let buildData = () => {
      let data: Record<string, any> = {};
      if (ctx.input.email) data.Email = ctx.input.email;
      if (ctx.input.firstName) data.FirstName = ctx.input.firstName;
      if (ctx.input.lastName) data.LastName = ctx.input.lastName;
      if (ctx.input.middleName) data.MiddleName = ctx.input.middleName;
      if (ctx.input.emailPermission !== undefined)
        data.EmailPerm = ctx.input.emailPermission ? '1' : '0';

      if (ctx.input.customFields) {
        for (let [key, value] of Object.entries(ctx.input.customFields)) {
          let match = key.match(/^field(\d+)$/i);
          if (match) {
            data[`Field${match[1]}`] = value;
          }
        }
      }

      return data;
    };

    switch (action) {
      case 'add': {
        if (!ctx.input.email) throw new Error('email is required when adding a contact');
        let data = buildData();
        if (!data.EmailPerm) data.EmailPerm = '1';
        let result = await client.addContact(listId, data);
        success = result?.Status === 1;
        resultContactId = String(result?.Data ?? '');
        message = success
          ? `Added contact **${ctx.input.email}** to list \`${listId}\` (contact ID: \`${resultContactId}\`).`
          : `Failed to add contact to list \`${listId}\`.`;
        break;
      }
      case 'update': {
        if (!contactId) throw new Error('contactId is required when updating a contact');
        let data = buildData();
        let result = await client.updateContact(listId, contactId, data);
        success = result?.Status === 1;
        resultContactId = contactId;
        message = success
          ? `Updated contact \`${contactId}\` in list \`${listId}\`.`
          : `Failed to update contact \`${contactId}\`.`;
        break;
      }
      case 'remove': {
        if (!contactId) throw new Error('contactId is required when removing a contact');
        let result = await client.deleteContact(listId, contactId);
        success = result?.Status === 1;
        message = success
          ? `Removed contact \`${contactId}\` from list \`${listId}\`.`
          : `Failed to remove contact \`${contactId}\`.`;
        break;
      }
    }

    return {
      output: { success, contactId: resultContactId },
      message
    };
  })
  .build();
