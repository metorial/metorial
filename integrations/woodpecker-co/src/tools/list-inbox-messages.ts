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
      perPage: z.number().optional().describe('Messages per page (maximum 50)'),
      nextPageCursor: z.string().optional().describe('Next page cursor returned by this tool'),
      previousPageCursor: z
        .string()
        .optional()
        .describe('Previous page cursor returned by this tool')
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
        .describe('List of inbox messages'),
      nextPageCursor: z.string().nullable().optional().describe('Cursor for the next page'),
      previousPageCursor: z
        .string()
        .nullable()
        .optional()
        .describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let params: Record<string, any> = {};
    if (ctx.input.campaignId) params.campaign_ids = String(ctx.input.campaignId);
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;
    if (ctx.input.nextPageCursor) params.next_page_cursor = ctx.input.nextPageCursor;
    if (ctx.input.previousPageCursor)
      params.previous_page_cursor = ctx.input.previousPageCursor;

    let data = await client.listInboxMessages(params);
    let messages = Array.isArray(data) ? data : (data?.content ?? data?.messages ?? []);

    let mapped = messages.map((m: any) => ({
      messageId: m.id,
      prospectEmail: m.from_email ?? m.email ?? m.prospect_email,
      subject: m.subject,
      body: typeof m.body === 'string' ? m.body : (m.body?.html ?? m.message),
      date: m.stamp ?? m.date,
      campaignId: m.campaign?.id ?? m.campaign_id,
      campaignName: m.campaign?.name ?? m.campaign_name
    }));

    return {
      output: {
        messages: mapped,
        nextPageCursor: data?.pagination?.next_page_cursor,
        previousPageCursor: data?.pagination?.previous_page_cursor
      },
      message: `Retrieved **${mapped.length}** inbox message(s).`
    };
  })
  .build();
