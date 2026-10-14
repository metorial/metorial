import { createApiServiceError, SlateTool } from 'slates';
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
      clientId: z
        .string()
        .optional()
        .describe(
          'Campaign client ID from Administration > API Overview; overrides campaignClientId in config'
        ),
      recipientAddress: z
        .string()
        .optional()
        .describe(
          'String recipient ID, usually an email address (for remove_recipient; preferred for email recipients)'
        ),
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
    let clientId = ctx.input.clientId ?? ctx.config.campaignClientId;
    if (!clientId)
      throw createApiServiceError('campaignClientId must be set in config for Campaign API');
    let client = new CampaignClient(ctx.auth.token, clientId);

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listRecipientLists({
          page: ctx.input.page,
          pageSize: ctx.input.pageSize
        });
        return {
          output: { recipientLists: Array.isArray(result) ? result : result.elements || [] },
          message: `Listed Campaign recipient lists.`
        };
      }
      case 'get': {
        if (!ctx.input.listId) throw createApiServiceError('listId is required');
        let recipientList = await client.getRecipientList(ctx.input.listId);
        return {
          output: { recipientList },
          message: `Retrieved recipient list **${recipientList.name || ctx.input.listId}**.`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw createApiServiceError('name is required');
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
        if (!ctx.input.listId) throw createApiServiceError('listId is required');
        if (!ctx.input.email) throw createApiServiceError('email is required');
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
        if (!ctx.input.listId) throw createApiServiceError('listId is required');
        let recipientId = ctx.input.recipientAddress ?? ctx.input.recipientId;
        if (recipientId === undefined || recipientId === '')
          throw createApiServiceError('recipientId or recipientAddress is required');
        await client.removeRecipient(ctx.input.listId, recipientId);
        return {
          output: {},
          message: `Removed recipient ${recipientId} from list ${ctx.input.listId}.`
        };
      }
    }
  })
  .build();
