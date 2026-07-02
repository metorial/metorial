import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConversationActivity = SlateTool.create(spec, {
  name: 'List Conversation Activity',
  key: 'list_conversation_activity',
  description: `List pages viewed, custom events, or file messages for a Crisp conversation. This gives support context beyond the message transcript.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID of the conversation'),
      activityType: z
        .enum(['pages', 'events', 'files'])
        .describe('Which conversation activity stream to list'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      activityType: z.enum(['pages', 'events', 'files']),
      items: z
        .array(
          z.object({
            pageTitle: z.string().optional().describe('Viewed page title'),
            pageUrl: z.string().optional().describe('Viewed page URL'),
            pageReferrer: z.string().optional().describe('Viewed page referrer URL'),
            text: z.string().optional().describe('Event text'),
            data: z.record(z.string(), z.any()).optional().describe('Event data'),
            color: z.string().optional().describe('Event color'),
            name: z.string().optional().describe('File name'),
            mimeType: z.string().optional().describe('File MIME type'),
            url: z.string().optional().describe('File URL'),
            fingerprint: z.number().optional().describe('File message fingerprint'),
            timestamp: z.number().optional().describe('Activity timestamp')
          })
        )
        .describe('Conversation activity items')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    let results: any[];

    if (ctx.input.activityType === 'pages') {
      results = await client.listConversationPages(ctx.input.sessionId, ctx.input.pageNumber);
    } else if (ctx.input.activityType === 'events') {
      results = await client.listConversationEvents(ctx.input.sessionId, ctx.input.pageNumber);
    } else {
      results = await client.listConversationFiles(ctx.input.sessionId, ctx.input.pageNumber);
    }

    let items = (results || []).map((item: any) => ({
      pageTitle: item.page_title,
      pageUrl: item.page_url,
      pageReferrer: item.page_referrer,
      text: item.text,
      data: item.data,
      color: item.color,
      name: item.name,
      mimeType: item.type,
      url: item.url,
      fingerprint: item.fingerprint,
      timestamp: item.timestamp
    }));

    return {
      output: {
        activityType: ctx.input.activityType,
        items
      },
      message: `Found **${items.length}** ${ctx.input.activityType} entries for conversation **${ctx.input.sessionId}**.`
    };
  })
  .build();
