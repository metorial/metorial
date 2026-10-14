import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageCampaignContacts = SlateTool.create(spec, {
  name: 'Manage Campaign Contacts',
  key: 'manage_campaign_contacts',
  description: `Add, list, or remove contacts from an email, LinkedIn, or advanced campaign. Supports adding individual contacts or bulk-adding to a list.
- **add**: Add a single contact to a campaign. If the campaign is running, the contact enters the loop immediately.
- **list**: Read one page of contacts in a campaign.
- **remove**: Remove a contact from a campaign by contact ID.
- **add_to_list**: Bulk-add contacts to a campaign contact list.
- **set_custom_field**: Set a custom field value on a contact.`
})
  .input(
    z.object({
      action: z
        .enum(['add', 'list', 'remove', 'add_to_list', 'set_custom_field'])
        .describe('Operation to perform'),
      campaignType: z.enum(['email', 'linkedin', 'advanced']).describe('Type of campaign'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for add, list, remove, set_custom_field)'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID (required for remove, set_custom_field)'),
      email: z.string().optional().describe('Contact email (for email/advanced campaigns)'),
      linkedInUrl: z
        .string()
        .optional()
        .describe('LinkedIn profile URL (for LinkedIn/advanced campaigns)'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      phone: z.string().optional().describe('Contact phone number'),
      companyName: z.string().optional().describe('Contact company name'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom fields as key-value pairs'),
      listId: z.string().optional().describe('List ID (required for add_to_list)'),
      contacts: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of contacts (for add_to_list)'),
      page: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(0)
        .describe('Zero-based contact page for list'),
      perPage: z
        .number()
        .int()
        .min(10)
        .max(10000)
        .optional()
        .default(100)
        .describe('Contacts per page for list'),
      fieldName: z.string().optional().describe('Custom field name (for set_custom_field)'),
      fieldValue: z.string().optional().describe('Custom field value (for set_custom_field)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      contacts: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of contacts (for list action)'),
      count: z.number().optional().describe('Total matching contacts'),
      page: z.number().optional().describe('Zero-based page returned'),
      contact: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Contact details (for add action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { action, campaignType, campaignId, contactId } = ctx.input;

    if (action === 'add') {
      if (!campaignId) throw createApiServiceError('Campaign ID is required');
      let result: unknown;

      if (campaignType === 'email') {
        if (!ctx.input.email)
          throw createApiServiceError('Email is required for email campaigns');
        result = await client.addContactToEmailCampaign({
          campaignId,
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          phone: ctx.input.phone,
          companyName: ctx.input.companyName,
          customFields: ctx.input.customFields,
          linkedInUrl: ctx.input.linkedInUrl
        });
      } else if (campaignType === 'linkedin') {
        if (!ctx.input.linkedInUrl)
          throw createApiServiceError('LinkedIn URL is required for LinkedIn campaigns');
        result = await client.addContactToLinkedInCampaign({
          campaignId,
          linkedInUrl: ctx.input.linkedInUrl,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          companyName: ctx.input.companyName,
          customFields: ctx.input.customFields
        });
      } else {
        if (!ctx.input.email && !ctx.input.linkedInUrl)
          throw createApiServiceError(
            'Provide an email address or LinkedIn profile URL for an advanced campaign contact.'
          );
        result = await client.addContactToAdvancedCampaign({
          campaignId,
          email: ctx.input.email,
          linkedInUrl: ctx.input.linkedInUrl,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          phone: ctx.input.phone,
          companyName: ctx.input.companyName,
          customFields: ctx.input.customFields
        });
      }

      return {
        output: { success: true, contact: result as Record<string, unknown> },
        message: `Added contact to **${campaignType}** campaign **${campaignId}**.`
      };
    }

    if (action === 'list') {
      if (!campaignId) throw createApiServiceError('Campaign ID is required');
      let contacts:
        | { list?: Record<string, unknown>[]; count?: number }
        | Record<string, unknown>[];

      if (campaignType === 'email') {
        contacts = await client.listEmailCampaignContacts(
          campaignId,
          ctx.input.page,
          ctx.input.perPage
        );
      } else if (campaignType === 'linkedin') {
        contacts = await client.listLinkedInCampaignContacts(
          campaignId,
          ctx.input.page,
          ctx.input.perPage
        );
      } else {
        contacts = await client.listAdvancedCampaignContacts(
          campaignId,
          ctx.input.page,
          ctx.input.perPage
        );
      }

      let contactList = Array.isArray(contacts) ? contacts : (contacts.list ?? []);
      return {
        output: {
          success: true,
          contacts: contactList,
          count: Array.isArray(contacts) ? contactList.length : contacts.count,
          page: ctx.input.page
        },
        message: `Listed **${contactList.length}** contact(s) in **${campaignType}** campaign.`
      };
    }

    if (action === 'remove') {
      if (!campaignId)
        throw createApiServiceError('Campaign ID is required to remove a contact.');
      if (!contactId) throw createApiServiceError('Contact ID is required');

      if (campaignType === 'email') {
        await client.deleteContactFromEmailCampaign(contactId, campaignId, ctx.input.email);
      } else if (campaignType === 'linkedin') {
        await client.deleteContactFromLinkedInCampaign(
          contactId,
          campaignId,
          ctx.input.linkedInUrl
        );
      } else {
        await client.deleteContactFromAdvancedCampaign(contactId, campaignId);
      }

      return {
        output: { success: true },
        message: `Removed contact **${contactId}** from **${campaignType}** campaign.`
      };
    }

    if (action === 'add_to_list') {
      if (!ctx.input.listId) throw createApiServiceError('List ID is required');
      if (!ctx.input.contacts || ctx.input.contacts.length === 0)
        throw createApiServiceError('Contacts array is required');

      if (campaignType === 'email') {
        await client.addContactsToEmailList({
          listId: ctx.input.listId,
          contacts: ctx.input.contacts as Array<{
            email: string;
            firstName?: string;
            lastName?: string;
            phone?: string;
            companyName?: string;
            customFields?: Record<string, string>;
          }>
        });
      } else if (campaignType === 'linkedin') {
        await client.addContactsToLinkedInList({
          listId: ctx.input.listId,
          contacts: ctx.input.contacts as Array<{
            linkedInUrl: string;
            firstName?: string;
            lastName?: string;
            email?: string;
            companyName?: string;
            customFields?: Record<string, string>;
          }>
        });
      } else {
        await client.addContactsToAdvancedList({
          listId: ctx.input.listId,
          contacts: ctx.input.contacts
        });
      }

      return {
        output: { success: true },
        message: `Added **${ctx.input.contacts.length}** contact(s) to list **${ctx.input.listId}**.`
      };
    }

    if (action === 'set_custom_field') {
      if (!campaignId)
        throw createApiServiceError('Campaign ID is required to update a contact field.');
      if (!contactId) throw createApiServiceError('Contact ID is required');
      if (!ctx.input.fieldName || ctx.input.fieldValue === undefined)
        throw createApiServiceError('Field name and value are required');

      if (campaignType === 'email') {
        await client.setContactCustomField(
          contactId,
          {
            field: ctx.input.fieldName,
            value: ctx.input.fieldValue
          },
          campaignId
        );
      } else if (campaignType === 'linkedin') {
        await client.setLinkedInContactCustomField(contactId, {
          field: ctx.input.fieldName,
          value: ctx.input.fieldValue
        });
      } else {
        await client.setAdvancedContactCustomField(
          contactId,
          {
            field: ctx.input.fieldName,
            value: ctx.input.fieldValue
          },
          campaignId
        );
      }

      return {
        output: { success: true },
        message: `Set custom field **${ctx.input.fieldName}** on contact **${contactId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
