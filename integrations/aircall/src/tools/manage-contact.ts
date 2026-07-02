import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or delete a contact in Aircall. When creating, provide at least first name, last name, and one phone number. When updating, specify only the fields to change. Also supports adding, updating, or removing phone numbers and emails on existing contacts.`,
  constraints: [
    'Phone numbers must be in E.164 format.',
    'Max 20 secondary phone numbers and emails per contact.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'update',
          'delete',
          'add_phone',
          'update_phone',
          'delete_phone',
          'add_email',
          'update_email',
          'delete_email'
        ])
        .describe('The operation to perform'),
      contactId: z
        .number()
        .optional()
        .describe('Contact ID (required for update, delete, and phone/email operations)'),
      firstName: z.string().optional().describe('First name (required for create)'),
      lastName: z.string().optional().describe('Last name (required for create)'),
      companyName: z.string().optional().describe('Company name'),
      information: z.string().optional().describe('Additional information or notes'),
      phoneNumbers: z
        .array(
          z.object({
            label: z.string().describe('Label (e.g., Work, Mobile, Home)'),
            value: z.string().describe('Phone number in E.164 format')
          })
        )
        .optional()
        .describe('Phone numbers (required for create, at least one)'),
      emails: z
        .array(
          z.object({
            label: z.string().describe('Label (e.g., Work, Personal)'),
            value: z.string().describe('Email address')
          })
        )
        .optional()
        .describe('Email addresses'),
      phoneNumberId: z
        .number()
        .optional()
        .describe('Phone number ID (for update_phone/delete_phone)'),
      emailId: z.number().optional().describe('Email ID (for update_email/delete_email)'),
      label: z
        .string()
        .optional()
        .describe('Label for phone/email (for add/update phone/email)'),
      value: z
        .string()
        .optional()
        .describe('Value for phone/email (for add/update phone/email)')
    })
  )
  .output(
    z.object({
      contactId: z.number().optional().describe('Contact ID'),
      fullName: z.string().optional().describe('Full name of the contact'),
      deleted: z.boolean().optional().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { action, contactId } = ctx.input;

    if (action === 'create') {
      if (
        !ctx.input.firstName ||
        !ctx.input.lastName ||
        !ctx.input.phoneNumbers ||
        ctx.input.phoneNumbers.length === 0
      ) {
        throw new Error(
          'firstName, lastName, and at least one phoneNumber are required for creating a contact'
        );
      }
      let contact = await client.createContact({
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        companyName: ctx.input.companyName,
        information: ctx.input.information,
        phoneNumbers: ctx.input.phoneNumbers,
        emails: ctx.input.emails
      });
      return {
        output: {
          contactId: contact.id,
          fullName: contact.name || `${ctx.input.firstName} ${ctx.input.lastName}`
        },
        message: `Created contact **${contact.name || `${ctx.input.firstName} ${ctx.input.lastName}`}** (#${contact.id}).`
      };
    }

    if (action === 'update') {
      if (!contactId) throw new Error('contactId is required for updating a contact');
      let contact = await client.updateContact(contactId, {
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        companyName: ctx.input.companyName,
        information: ctx.input.information
      });
      return {
        output: {
          contactId: contact.id,
          fullName: contact.name ?? null
        },
        message: `Updated contact **${contact.name}** (#${contact.id}).`
      };
    }

    if (action === 'delete') {
      if (!contactId) throw new Error('contactId is required for deleting a contact');
      await client.deleteContact(contactId);
      return {
        output: { contactId, deleted: true },
        message: `Deleted contact **#${contactId}**.`
      };
    }

    if (action === 'add_phone') {
      if (!contactId || !ctx.input.label || !ctx.input.value) {
        throw new Error('contactId, label, and value are required for adding a phone number');
      }
      let contact = await client.addContactPhoneNumber(
        contactId,
        ctx.input.label,
        ctx.input.value
      );
      return {
        output: { contactId: contact.id, fullName: contact.name ?? null },
        message: `Added phone number **${ctx.input.value}** to contact #${contactId}.`
      };
    }

    if (action === 'update_phone') {
      if (!contactId || !ctx.input.phoneNumberId || !ctx.input.label || !ctx.input.value) {
        throw new Error(
          'contactId, phoneNumberId, label, and value are required for updating a phone number'
        );
      }
      let contact = await client.updateContactPhoneNumber(
        contactId,
        ctx.input.phoneNumberId,
        ctx.input.label,
        ctx.input.value
      );
      return {
        output: { contactId: contact.id, fullName: contact.name ?? null },
        message: `Updated phone number on contact #${contactId}.`
      };
    }

    if (action === 'delete_phone') {
      if (!contactId || !ctx.input.phoneNumberId) {
        throw new Error(
          'contactId and phoneNumberId are required for deleting a phone number'
        );
      }
      let contact = await client.deleteContactPhoneNumber(contactId, ctx.input.phoneNumberId);
      return {
        output: { contactId: contact.id, fullName: contact.name ?? null },
        message: `Deleted phone number from contact #${contactId}.`
      };
    }

    if (action === 'add_email') {
      if (!contactId || !ctx.input.label || !ctx.input.value) {
        throw new Error('contactId, label, and value are required for adding an email');
      }
      let contact = await client.addContactEmail(contactId, ctx.input.label, ctx.input.value);
      return {
        output: { contactId: contact.id, fullName: contact.name ?? null },
        message: `Added email **${ctx.input.value}** to contact #${contactId}.`
      };
    }

    if (action === 'update_email') {
      if (!contactId || !ctx.input.emailId || !ctx.input.label || !ctx.input.value) {
        throw new Error(
          'contactId, emailId, label, and value are required for updating an email'
        );
      }
      let contact = await client.updateContactEmail(
        contactId,
        ctx.input.emailId,
        ctx.input.label,
        ctx.input.value
      );
      return {
        output: { contactId: contact.id, fullName: contact.name ?? null },
        message: `Updated email on contact #${contactId}.`
      };
    }

    if (action === 'delete_email') {
      if (!contactId || !ctx.input.emailId) {
        throw new Error('contactId and emailId are required for deleting an email');
      }
      let contact = await client.deleteContactEmail(contactId, ctx.input.emailId);
      return {
        output: { contactId: contact.id, fullName: contact.name ?? null },
        message: `Deleted email from contact #${contactId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
