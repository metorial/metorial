import { SlateTool } from 'slates';
import { z } from 'zod';
import { CampaignClient } from '../lib/campaign-client';
import { spec } from '../spec';

export let manageMailing = SlateTool.create(spec, {
  name: 'Manage Mailing',
  key: 'manage_mailing',
  description: `Create, update, retrieve, send, copy, or list mailings in Optimizely Campaign.
Mailings are email messages that can be designed, configured, and sent to recipient lists.`,
  instructions: [
    'The config must have campaignClientId set for Campaign API calls.',
    'Use "send" action to trigger the sending of a prepared mailing.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'list', 'send', 'copy'])
        .describe('Action to perform'),
      mailingId: z
        .number()
        .optional()
        .describe('Mailing ID (required for get, update, send, copy)'),
      name: z.string().optional().describe('Mailing name (for create/update)'),
      subject: z.string().optional().describe('Email subject (for create/update)'),
      senderAddress: z
        .string()
        .optional()
        .describe('Sender email address (for create/update)'),
      senderName: z.string().optional().describe('Sender display name (for create/update)'),
      recipientListId: z.number().optional().describe('Recipient list ID (for create/update)'),
      content: z
        .record(z.string(), z.any())
        .optional()
        .describe('Mailing content data (for create/update)'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Items per page (for list)')
    })
  )
  .output(
    z.object({
      mailing: z.any().optional().describe('Mailing data'),
      mailings: z.array(z.any()).optional().describe('List of mailings')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.campaignClientId)
      throw new Error('campaignClientId must be set in config for Campaign API');
    let client = new CampaignClient(ctx.auth.token, ctx.config.campaignClientId);

    switch (ctx.input.action) {
      case 'list': {
        let mailings = await client.listMailings({
          page: ctx.input.page,
          pageSize: ctx.input.pageSize
        });
        return {
          output: { mailings: Array.isArray(mailings) ? mailings : [] },
          message: `Listed Campaign mailings.`
        };
      }
      case 'get': {
        if (!ctx.input.mailingId) throw new Error('mailingId is required');
        let mailing = await client.getMailing(ctx.input.mailingId);
        return {
          output: { mailing },
          message: `Retrieved mailing **${mailing.name || ctx.input.mailingId}**.`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required');
        let mailing = await client.createMailing({
          name: ctx.input.name,
          subject: ctx.input.subject,
          senderAddress: ctx.input.senderAddress,
          senderName: ctx.input.senderName,
          recipientListId: ctx.input.recipientListId,
          content: ctx.input.content
        });
        return {
          output: { mailing },
          message: `Created mailing **${mailing.name}**.`
        };
      }
      case 'update': {
        if (!ctx.input.mailingId) throw new Error('mailingId is required');
        let updateData: Record<string, any> = {};
        if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
        if (ctx.input.subject !== undefined) updateData.subject = ctx.input.subject;
        if (ctx.input.senderAddress !== undefined)
          updateData.senderAddress = ctx.input.senderAddress;
        if (ctx.input.senderName !== undefined) updateData.senderName = ctx.input.senderName;
        if (ctx.input.recipientListId !== undefined)
          updateData.recipientListId = ctx.input.recipientListId;
        if (ctx.input.content !== undefined) updateData.content = ctx.input.content;
        let mailing = await client.updateMailing(ctx.input.mailingId, updateData);
        return {
          output: { mailing },
          message: `Updated mailing **${mailing.name || ctx.input.mailingId}**.`
        };
      }
      case 'send': {
        if (!ctx.input.mailingId) throw new Error('mailingId is required');
        let result = await client.sendMailing(ctx.input.mailingId);
        return {
          output: { mailing: result },
          message: `Sent mailing ${ctx.input.mailingId}.`
        };
      }
      case 'copy': {
        if (!ctx.input.mailingId) throw new Error('mailingId is required');
        let mailing = await client.copyMailing(ctx.input.mailingId);
        return {
          output: { mailing },
          message: `Copied mailing ${ctx.input.mailingId}.`
        };
      }
    }
  })
  .build();
