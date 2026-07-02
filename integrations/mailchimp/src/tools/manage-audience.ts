import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { mailchimpServiceError } from '../lib/errors';
import { spec } from '../spec';

let contactSchema = z
  .object({
    company: z.string().describe('Company name'),
    address1: z.string().describe('Street address line 1'),
    address2: z.string().optional().describe('Street address line 2'),
    city: z.string().describe('City'),
    state: z.string().describe('State or province'),
    zip: z.string().describe('Postal code'),
    country: z.string().describe('Country code (e.g., "US")'),
    phone: z.string().optional().describe('Phone number')
  })
  .optional();

let campaignDefaultsSchema = z
  .object({
    fromName: z.string().describe('Default "from" name'),
    fromEmail: z.string().describe('Default "from" email address'),
    subject: z.string().describe('Default subject line'),
    language: z.string().optional().describe('Default language (e.g., "en")')
  })
  .optional();

export let manageAudienceTool = SlateTool.create(spec, {
  name: 'Manage Audience',
  key: 'manage_audience',
  description: `Create, update, or delete an audience (list). To create, provide name, contact info, permission reminder, and campaign defaults. To update, provide the listId and the fields to change. To delete, provide the listId and set "delete" to true.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z
        .string()
        .optional()
        .describe('Audience ID (required for update/delete, omit for create)'),
      delete: z.boolean().optional().describe('Set to true to delete the audience'),
      name: z.string().optional().describe('Name of the audience'),
      permissionReminder: z
        .string()
        .optional()
        .describe('Permission reminder text for subscribers'),
      emailTypeOption: z
        .boolean()
        .optional()
        .describe('Whether to allow subscribers to choose email format'),
      contact: contactSchema.describe('Required contact info for creating an audience'),
      campaignDefaults: campaignDefaultsSchema.describe('Default campaign settings')
    })
  )
  .output(
    z.object({
      listId: z.string().optional(),
      name: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    if (ctx.input.delete && ctx.input.listId) {
      await client.deleteList(ctx.input.listId);
      return {
        output: { listId: ctx.input.listId, deleted: true },
        message: `Audience **${ctx.input.listId}** has been deleted.`
      };
    }

    if (ctx.input.listId) {
      let updateData: Record<string, any> = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.permissionReminder)
        updateData.permission_reminder = ctx.input.permissionReminder;
      if (ctx.input.emailTypeOption !== undefined)
        updateData.email_type_option = ctx.input.emailTypeOption;
      if (ctx.input.contact) {
        updateData.contact = {
          company: ctx.input.contact.company,
          address1: ctx.input.contact.address1,
          address2: ctx.input.contact.address2 ?? '',
          city: ctx.input.contact.city,
          state: ctx.input.contact.state,
          zip: ctx.input.contact.zip,
          country: ctx.input.contact.country,
          phone: ctx.input.contact.phone ?? ''
        };
      }
      if (ctx.input.campaignDefaults) {
        updateData.campaign_defaults = {
          from_name: ctx.input.campaignDefaults.fromName,
          from_email: ctx.input.campaignDefaults.fromEmail,
          subject: ctx.input.campaignDefaults.subject,
          language: ctx.input.campaignDefaults.language ?? 'en'
        };
      }

      if (Object.keys(updateData).length === 0) {
        throw mailchimpServiceError(
          'At least one field must be provided to update an audience.'
        );
      }

      let result = await client.updateList(ctx.input.listId, updateData);
      return {
        output: { listId: result.id, name: result.name },
        message: `Audience **${result.name}** has been updated.`
      };
    }

    // Create
    if (!ctx.input.name || !ctx.input.permissionReminder) {
      throw mailchimpServiceError(
        'name and permissionReminder are required to create an audience.'
      );
    }
    if (!ctx.input.contact) {
      throw mailchimpServiceError('contact is required to create an audience.');
    }
    if (!ctx.input.campaignDefaults) {
      throw mailchimpServiceError('campaignDefaults is required to create an audience.');
    }

    let createData: Record<string, any> = {
      name: ctx.input.name,
      permission_reminder: ctx.input.permissionReminder,
      email_type_option: ctx.input.emailTypeOption ?? false
    };

    if (ctx.input.contact) {
      createData.contact = {
        company: ctx.input.contact.company,
        address1: ctx.input.contact.address1,
        address2: ctx.input.contact.address2 ?? '',
        city: ctx.input.contact.city,
        state: ctx.input.contact.state,
        zip: ctx.input.contact.zip,
        country: ctx.input.contact.country,
        phone: ctx.input.contact.phone ?? ''
      };
    }

    if (ctx.input.campaignDefaults) {
      createData.campaign_defaults = {
        from_name: ctx.input.campaignDefaults.fromName,
        from_email: ctx.input.campaignDefaults.fromEmail,
        subject: ctx.input.campaignDefaults.subject,
        language: ctx.input.campaignDefaults.language ?? 'en'
      };
    }

    let result = await client.createList(createData);
    return {
      output: { listId: result.id, name: result.name },
      message: `Audience **${result.name}** (${result.id}) has been created.`
    };
  })
  .build();
