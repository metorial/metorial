import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or delete a contact in your DialMyCalls account.
Use **create** to add a new contact with a phone number.
Use **update** to modify an existing contact's details.
Use **delete** to remove a contact.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('The operation to perform on the contact.'),
      contactId: z.string().optional().describe('Required for update and delete actions.'),
      phone: z.string().optional().describe('Contact phone number. Required for create.'),
      firstName: z.string().optional().describe('Contact first name.'),
      lastName: z.string().optional().describe('Contact last name.'),
      extension: z.string().optional().describe('Phone extension.'),
      email: z.string().optional().describe('Contact email address.'),
      extraData: z
        .string()
        .optional()
        .describe('Miscellaneous custom data about the contact.'),
      groupIds: z
        .array(z.string())
        .optional()
        .describe('List of group IDs to assign the contact to.')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      extension: z.string().optional(),
      email: z.string().optional(),
      extraData: z.string().optional(),
      groups: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      action,
      contactId,
      phone,
      firstName,
      lastName,
      extension,
      email,
      extraData,
      groupIds
    } = ctx.input;

    if (action === 'delete') {
      if (!contactId) throw new Error('contactId is required for delete action');
      await client.deleteContact(contactId);
      return {
        output: { contactId },
        message: `Contact \`${contactId}\` deleted successfully.`
      };
    }

    if (action === 'create') {
      if (!phone) throw new Error('phone is required for create action');
      let result = await client.createContact({
        phone,
        firstname: firstName,
        lastname: lastName,
        extension,
        email,
        extra1: extraData,
        groups: groupIds
      });
      return {
        output: {
          contactId: result.id,
          firstName: result.firstname,
          lastName: result.lastname,
          phone: result.phone,
          extension: result.extension,
          email: result.email,
          extraData: result.extra1,
          groups: result.groups,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Contact created successfully with ID \`${result.id}\`.`
      };
    }

    // update
    if (!contactId) throw new Error('contactId is required for update action');
    let result = await client.updateContact(contactId, {
      phone,
      firstname: firstName,
      lastname: lastName,
      extension,
      email,
      extra1: extraData,
      groups: groupIds
    });
    return {
      output: {
        contactId: result.id,
        firstName: result.firstname,
        lastName: result.lastname,
        phone: result.phone,
        extension: result.extension,
        email: result.email,
        extraData: result.extra1,
        groups: result.groups,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `Contact \`${contactId}\` updated successfully.`
    };
  })
  .build();
