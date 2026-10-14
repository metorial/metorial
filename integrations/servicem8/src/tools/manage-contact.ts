import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create or update a company contact in ServiceM8. If a contactUuid is provided, the existing contact is updated. Otherwise, a new contact is created linked to the specified company.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactUuid: z
        .string()
        .optional()
        .describe('UUID of an existing contact to update. Omit to create a new contact.'),
      companyUuid: z
        .string()
        .optional()
        .describe('UUID of the company to link the contact to (required for creation)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      jobTitle: z
        .string()
        .optional()
        .describe('Unsupported by this endpoint; omit this field'),
      type: z.string().optional().describe('Contact role, such as JOB or BILLING'),
      isPrimary: z.string().optional().describe('Set to "1" to make this the primary contact')
    })
  )
  .output(
    z.object({
      contactUuid: z.string().describe('UUID of the created or updated contact')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.contactUuid && !ctx.input.companyUuid) {
      throw createApiServiceError(
        'Provide companyUuid when creating a contact. Call list_clients to discover clients.'
      );
    }
    if (ctx.input.jobTitle !== undefined) {
      throw createApiServiceError(
        'ServiceM8 company contacts do not support jobTitle. Omit this field.'
      );
    }
    let client = new Client(ctx.auth);

    let data: Record<string, any> = {};
    if (ctx.input.companyUuid) data.company_uuid = ctx.input.companyUuid;
    if (ctx.input.firstName !== undefined) data.first = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) data.last = ctx.input.lastName;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;
    if (ctx.input.mobile !== undefined) data.mobile = ctx.input.mobile;
    if (ctx.input.type !== undefined) data.type = ctx.input.type;
    if (ctx.input.isPrimary !== undefined) data.is_primary_contact = ctx.input.isPrimary;

    let contactUuid: string;
    let action: string;

    if (ctx.input.contactUuid) {
      await client.updateCompanyContact(ctx.input.contactUuid, data);
      contactUuid = ctx.input.contactUuid;
      action = 'Updated';
    } else {
      contactUuid = await client.createCompanyContact(data);
      action = 'Created';
    }

    return {
      output: { contactUuid },
      message: `${action} contact **${contactUuid}**${ctx.input.firstName ? ` (${ctx.input.firstName}${ctx.input.lastName ? ` ${ctx.input.lastName}` : ''})` : ''}.`
    };
  })
  .build();
