import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContactDetails = SlateTool.create(spec, {
  name: 'Manage Contact Details',
  key: 'manage_contact_details',
  description: `Add, update, or remove contact details (phone numbers, emails, websites, social media) for a person in CentralStationCRM. Use this to enrich a person's profile with communication channels.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'update', 'remove', 'list']).describe('Action to perform'),
      personId: z.number().describe('ID of the person'),
      contactDetailId: z
        .number()
        .optional()
        .describe('ID of the contact detail (required for update and remove)'),
      contactType: z
        .string()
        .optional()
        .describe(
          'Type of contact detail (e.g., "email", "phone_work", "phone_mobile", "homepage", "twitter", "skype")'
        ),
      contactValue: z
        .string()
        .optional()
        .describe('Value of the contact detail (e.g., email address, phone number, URL)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      contactDetailId: z.number().optional().describe('ID of the contact detail'),
      contactDetails: z
        .array(z.any())
        .optional()
        .describe('List of contact details (when action is "list")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    if (ctx.input.action === 'list') {
      let result = await client.listPersonContactDetails(ctx.input.personId);
      let items = Array.isArray(result) ? result : [];

      return {
        output: {
          success: true,
          contactDetails: items
        },
        message: `Found **${items.length}** contact details for person (ID: ${ctx.input.personId}).`
      };
    }

    if (ctx.input.action === 'add') {
      let result = await client.createPersonContactDetail(ctx.input.personId, {
        name: ctx.input.contactValue,
        type: ctx.input.contactType
      });
      let detail = result?.contact_detail ?? result;

      return {
        output: {
          success: true,
          contactDetailId: detail?.id
        },
        message: `Added ${ctx.input.contactType ?? 'contact detail'} to person (ID: ${ctx.input.personId}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.contactDetailId) {
        throw new Error('contactDetailId is required when updating a contact detail');
      }
      let data: Record<string, unknown> = {};
      if (ctx.input.contactValue !== undefined) data.name = ctx.input.contactValue;
      if (ctx.input.contactType !== undefined) data.type = ctx.input.contactType;

      let result = await client.updatePersonContactDetail(
        ctx.input.personId,
        ctx.input.contactDetailId,
        data
      );
      let detail = result?.contact_detail ?? result;

      return {
        output: {
          success: true,
          contactDetailId: detail?.id
        },
        message: `Updated contact detail (ID: ${ctx.input.contactDetailId}) for person (ID: ${ctx.input.personId}).`
      };
    }

    // remove
    if (!ctx.input.contactDetailId) {
      throw new Error('contactDetailId is required when removing a contact detail');
    }
    await client.deletePersonContactDetail(ctx.input.personId, ctx.input.contactDetailId);

    return {
      output: {
        success: true,
        contactDetailId: ctx.input.contactDetailId
      },
      message: `Removed contact detail (ID: ${ctx.input.contactDetailId}) from person (ID: ${ctx.input.personId}).`
    };
  })
  .build();
