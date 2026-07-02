import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInboxMessages = SlateTool.create(spec, {
  name: 'List Inbox Messages',
  key: 'list_inbox_messages',
  description: `Retrieve messages from the Woodpecker inbox. Browse or filter replies from prospects across campaigns.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().optional().describe('Filter messages by campaign ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Messages per page')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.number().optional().describe('Message ID'),
            prospectEmail: z.string().optional().describe('Prospect email address'),
            subject: z.string().optional().describe('Email subject'),
            body: z.string().optional().describe('Message body'),
            date: z.string().optional().describe('Message date'),
            campaignId: z.number().optional().describe('Campaign ID'),
            campaignName: z.string().optional().describe('Campaign name')
          })
        )
        .describe('List of inbox messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let params: Record<string, any> = {};
    if (ctx.input.campaignId) params.campaign_id = ctx.input.campaignId;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;

    let data = await client.listInboxMessages(params);
    let messages = Array.isArray(data) ? data : (data?.messages ?? []);

    let mapped = messages.map((m: any) => ({
      messageId: m.id,
      prospectEmail: m.email ?? m.prospect_email,
      subject: m.subject,
      body: m.body ?? m.message,
      date: m.date,
      campaignId: m.campaign_id,
      campaignName: m.campaign_name
    }));

    return {
      output: { messages: mapped },
      message: `Retrieved **${mapped.length}** inbox message(s).`
    };
  })
  .build();
