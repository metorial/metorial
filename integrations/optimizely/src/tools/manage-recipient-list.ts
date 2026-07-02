import { SlateTool } from 'slates';
import { z } from 'zod';
import { CampaignClient } from '../lib/campaign-client';
import { spec } from '../spec';

export let manageRecipientList = SlateTool.create(spec, {
  name: 'Manage Recipient List',
  key: 'manage_recipient_list',
  description: `Create, retrieve, or list recipient lists and manage recipients in Optimizely Campaign.
Recipient lists hold subscriber data that mailings are sent to. Use this to manage lists, add or remove individual recipients.`,
  instructions: ['The config must have campaignClientId set for Campaign API calls.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'add_recipient', 'remove_recipient'])
        .describe('Action to perform'),
      listId: z
        .number()
        .optional()
        .describe('Recipient list ID (required for get, add_recipient, remove_recipient)'),
      name: z.string().optional().describe('Recipient list name (for create)'),
      description: z.string().optional().describe('List description (for create)'),
      email: z.string().optional().describe('Recipient email address (for add_recipient)'),
      recipientId: z
        .number()
        .optional()
        .describe('Recipient ID to remove (for remove_recipient)'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional recipient attributes (for add_recipient)'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Items per page (for list)')
    })
  )
  .output(
    z.object({
      recipientList: z.any().optional().describe('Recipient list data'),
      recipientLists: z.array(z.any()).optional().describe('List of recipient lists'),
      recipient: z.any().optional().describe('Recipient data')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.campaignClientId)
      throw new Error('campaignClientId must be set in config for Campaign API');
    let client = new CampaignClient(ctx.auth.token, ctx.config.campaignClientId);

    switch (ctx.input.action) {
      case 'list': {
        let recipientLists = await client.listRecipientLists({
          page: ctx.input.page,
          pageSize: ctx.input.pageSize
        });
        return {
          output: { recipientLists: Array.isArray(recipientLists) ? recipientLists : [] },
          message: `Listed Campaign recipient lists.`
        };
      }
      case 'get': {
        if (!ctx.input.listId) throw new Error('listId is required');
        let recipientList = await client.getRecipientList(ctx.input.listId);
        return {
          output: { recipientList },
          message: `Retrieved recipient list **${recipientList.name || ctx.input.listId}**.`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required');
        let recipientList = await client.createRecipientList({
          name: ctx.input.name,
          description: ctx.input.description
        });
        return {
          output: { recipientList },
          message: `Created recipient list **${recipientList.name}**.`
        };
      }
      case 'add_recipient': {
        if (!ctx.input.listId) throw new Error('listId is required');
        if (!ctx.input.email) throw new Error('email is required');
        let recipient = await client.addRecipient(ctx.input.listId, {
          email: ctx.input.email,
          attributes: ctx.input.attributes
        });
        return {
          output: { recipient },
          message: `Added recipient **${ctx.input.email}** to list ${ctx.input.listId}.`
        };
      }
      case 'remove_recipient': {
        if (!ctx.input.listId) throw new Error('listId is required');
        if (!ctx.input.recipientId) throw new Error('recipientId is required');
        await client.removeRecipient(ctx.input.listId, ctx.input.recipientId);
        return {
          output: {},
          message: `Removed recipient ${ctx.input.recipientId} from list ${ctx.input.listId}.`
        };
      }
    }
  })
  .build();
