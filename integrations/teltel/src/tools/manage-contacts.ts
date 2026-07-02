import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  phone: z.string().describe('Contact phone number'),
  name: z.string().optional().describe('Contact name'),
  param1: z.string().optional().describe('Custom parameter 1'),
  param2: z.string().optional().describe('Custom parameter 2'),
  param3: z.string().optional().describe('Custom parameter 3'),
  param4: z.string().optional().describe('Custom parameter 4'),
  param5: z.string().optional().describe('Custom parameter 5')
});

export let manageContactsTool = SlateTool.create(spec, {
  name: 'Manage Campaign Contacts',
  key: 'manage_campaign_contacts',
  description: `Add, list, or remove contacts from an auto dialer campaign. Supports adding single contacts or bulk uploading multiple contacts at once.
Each contact can include a phone number, name, and up to 5 custom parameters.
When dynamically adding contacts via the API, enable the "Disable auto stop" option in the campaign settings.`,
  instructions: [
    'For bulk adding, provide an array of contacts in the "contacts" field.',
    'For single contact addition, provide the "phone" field directly.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add', 'add_bulk', 'list', 'delete'])
        .describe('Action to perform on campaign contacts'),
      campaignId: z.string().describe('Campaign ID to manage contacts for'),
      phone: z.string().optional().describe('Contact phone number (for single add)'),
      name: z.string().optional().describe('Contact name (for single add)'),
      param1: z.string().optional().describe('Custom parameter 1 (for single add)'),
      param2: z.string().optional().describe('Custom parameter 2 (for single add)'),
      param3: z.string().optional().describe('Custom parameter 3 (for single add)'),
      param4: z.string().optional().describe('Custom parameter 4 (for single add)'),
      param5: z.string().optional().describe('Custom parameter 5 (for single add)'),
      contacts: z.array(contactSchema).optional().describe('Array of contacts for bulk add'),
      contactId: z.string().optional().describe('Contact ID (for delete)'),
      limit: z.number().optional().describe('Maximum results to return (for list)'),
      offset: z.number().optional().describe('Pagination offset (for list)'),
      status: z.string().optional().describe('Filter contacts by status (for list)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      contacts: z.array(z.any()).optional().describe('Contact data returned from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelTelClient(ctx.auth.token);
    let result: any;
    let message: string = '';

    switch (ctx.input.action) {
      case 'add': {
        if (!ctx.input.phone) {
          throw new Error('Phone number is required when adding a contact');
        }
        result = await client.addCampaignContact(ctx.input.campaignId, {
          phone: ctx.input.phone,
          name: ctx.input.name,
          param1: ctx.input.param1,
          param2: ctx.input.param2,
          param3: ctx.input.param3,
          param4: ctx.input.param4,
          param5: ctx.input.param5
        });
        message = `Contact **${ctx.input.phone}** added to campaign **${ctx.input.campaignId}**.`;
        break;
      }
      case 'add_bulk': {
        if (!ctx.input.contacts || ctx.input.contacts.length === 0) {
          throw new Error('Contacts array is required for bulk add');
        }
        result = await client.addCampaignContactsBulk(
          ctx.input.campaignId,
          ctx.input.contacts
        );
        message = `**${ctx.input.contacts.length}** contact(s) added to campaign **${ctx.input.campaignId}**.`;
        break;
      }
      case 'list': {
        result = await client.listCampaignContacts(ctx.input.campaignId, {
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          status: ctx.input.status
        });
        let contacts = Array.isArray(result)
          ? result
          : (result?.data ?? result?.contacts ?? []);
        return {
          output: {
            success: true,
            contacts
          },
          message: `Retrieved **${contacts.length}** contact(s) from campaign **${ctx.input.campaignId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.contactId) {
          throw new Error('Contact ID is required when deleting a contact');
        }
        result = await client.deleteCampaignContact(ctx.input.campaignId, ctx.input.contactId);
        message = `Contact **${ctx.input.contactId}** removed from campaign **${ctx.input.campaignId}**.`;
        break;
      }
    }

    return {
      output: {
        success: true,
        contacts: result ? [result] : undefined
      },
      message
    };
  })
  .build();
