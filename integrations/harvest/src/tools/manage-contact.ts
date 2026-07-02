import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or delete a client contact in Harvest. Contacts belong to clients and include name, email, phone, and title information.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      contactId: z.number().optional().describe('Contact ID (required for update/delete)'),
      clientId: z.number().optional().describe('Client ID (required for create)'),
      firstName: z.string().optional().describe('First name (required for create)'),
      lastName: z.string().optional().describe('Last name'),
      title: z.string().optional().describe('Job title'),
      email: z.string().optional().describe('Email address'),
      phoneOffice: z.string().optional().describe('Office phone number'),
      phoneMobile: z.string().optional().describe('Mobile phone number'),
      fax: z.string().optional().describe('Fax number')
    })
  )
  .output(
    z.object({
      contactId: z.number().optional().describe('ID of the contact'),
      clientId: z.number().optional().describe('Client ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().nullable().describe('Last name'),
      title: z.string().optional().nullable().describe('Job title'),
      email: z.string().optional().nullable().describe('Email'),
      phoneOffice: z.string().optional().nullable().describe('Office phone'),
      phoneMobile: z.string().optional().nullable().describe('Mobile phone'),
      deleted: z.boolean().optional().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.contactId) throw new Error('contactId is required for delete');
      await client.deleteContact(ctx.input.contactId);
      return {
        output: { contactId: ctx.input.contactId, deleted: true },
        message: `Deleted contact **#${ctx.input.contactId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.clientId || !ctx.input.firstName) {
        throw new Error('clientId and firstName are required for create');
      }
      let contact = await client.createContact({
        clientId: ctx.input.clientId,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        title: ctx.input.title,
        email: ctx.input.email,
        phoneOffice: ctx.input.phoneOffice,
        phoneMobile: ctx.input.phoneMobile,
        fax: ctx.input.fax
      });
      return {
        output: {
          contactId: contact.id,
          clientId: contact.client?.id,
          firstName: contact.first_name,
          lastName: contact.last_name,
          title: contact.title,
          email: contact.email,
          phoneOffice: contact.phone_office,
          phoneMobile: contact.phone_mobile
        },
        message: `Created contact **${contact.first_name} ${contact.last_name ?? ''}** (#${contact.id}).`
      };
    }

    // update
    if (!ctx.input.contactId) throw new Error('contactId is required for update');
    let contact = await client.updateContact(ctx.input.contactId, {
      clientId: ctx.input.clientId,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      title: ctx.input.title,
      email: ctx.input.email,
      phoneOffice: ctx.input.phoneOffice,
      phoneMobile: ctx.input.phoneMobile,
      fax: ctx.input.fax
    });
    return {
      output: {
        contactId: contact.id,
        clientId: contact.client?.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        title: contact.title,
        email: contact.email,
        phoneOffice: contact.phone_office,
        phoneMobile: contact.phone_mobile
      },
      message: `Updated contact **${contact.first_name} ${contact.last_name ?? ''}** (#${contact.id}).`
    };
  })
  .build();
