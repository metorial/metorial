import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type CompanyInput } from '../lib/client';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Creates a new company in SuiteDash CRM. A primary contact is optional for Leads and required for Prospects and Clients. If a primary contact email is provided and no matching contact exists, one can be created automatically. Companies can be assigned a role of **Lead**, **Prospect**, or **Client**.`,
  instructions: [
    'If you provide primary contact details, the contact will be associated with the company.',
    'Set createPrimaryContactIfNotExists to false to prevent automatic contact creation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyName: z.string().describe('Name of the company'),
      role: z.enum(['Lead', 'Prospect', 'Client']).describe('Role assigned to the company'),
      primaryContactFirstName: z
        .string()
        .optional()
        .describe('First name of the primary contact'),
      primaryContactLastName: z
        .string()
        .optional()
        .describe('Last name of the primary contact'),
      primaryContactEmail: z.string().optional().describe('Email of the primary contact'),
      sendWelcomeEmail: z
        .boolean()
        .optional()
        .describe('Whether to send a welcome email to the primary contact'),
      createPrimaryContactIfNotExists: z
        .boolean()
        .optional()
        .describe('Create the primary contact if no match found (default: true)'),
      preventIndividualMode: z
        .boolean()
        .optional()
        .describe(
          'Prevent the primary contact from switching to individual mode (default: false)'
        )
    })
  )
  .output(
    z.object({
      company: z.record(z.string(), z.unknown()).describe('The created company record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicId: ctx.auth.publicId,
      secretKey: ctx.auth.secretKey
    });

    let payload: CompanyInput = {
      name: ctx.input.companyName,
      role: ctx.input.role
    };

    let hasPrimaryContact =
      ctx.input.primaryContactFirstName ||
      ctx.input.primaryContactLastName ||
      ctx.input.primaryContactEmail;

    if (
      (hasPrimaryContact || ctx.input.role !== 'Lead') &&
      !ctx.input.primaryContactEmail?.trim()
    ) {
      throw createApiServiceError(
        'A primary contact email is required when providing contact details or creating a Prospect or Client company.',
        {
          reason: 'primary_contact_email_required'
        }
      );
    }

    if (hasPrimaryContact) {
      let createPrimaryContact = ctx.input.createPrimaryContactIfNotExists ?? true;
      if (
        createPrimaryContact &&
        (!ctx.input.primaryContactFirstName?.trim() ||
          !ctx.input.primaryContactLastName?.trim())
      ) {
        throw createApiServiceError(
          'Provide the primary contact first and last name, or set createPrimaryContactIfNotExists to false to use an existing contact.',
          {
            reason: 'primary_contact_name_required'
          }
        );
      }
      let primaryContact: NonNullable<CompanyInput['primaryContact']> = {
        email: ctx.input.primaryContactEmail!,
        create_primary_contact_if_not_exists: createPrimaryContact
      };
      if (ctx.input.primaryContactFirstName)
        primaryContact.first_name = ctx.input.primaryContactFirstName;
      if (ctx.input.primaryContactLastName)
        primaryContact.last_name = ctx.input.primaryContactLastName;
      if (ctx.input.primaryContactEmail) primaryContact.email = ctx.input.primaryContactEmail;
      if (ctx.input.sendWelcomeEmail !== undefined)
        primaryContact.send_welcome_email = ctx.input.sendWelcomeEmail;
      if (ctx.input.preventIndividualMode !== undefined)
        primaryContact.prevent_individual_mode = ctx.input.preventIndividualMode;
      payload.primaryContact = primaryContact;
    }

    let result = await client.createCompany(payload);

    return {
      output: { company: result },
      message: `Created company **${ctx.input.companyName}** with role **${ctx.input.role}**.`
    };
  })
  .build();
