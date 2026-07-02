import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let liveFeedMessageSchema = z.object({
  messageId: z.string().describe('Message ID'),
  fromEmail: z.string().optional().describe('Sender email'),
  fromName: z.string().optional().describe('Sender name'),
  subject: z.string().optional().describe('Email subject'),
  recipients: z.array(z.any()).optional().describe('Message recipients'),
  sent: z.number().optional().describe('Sent timestamp (ms)'),
  numOpens: z.number().optional().describe('Number of opens'),
  numClicks: z.number().optional().describe('Number of link clicks'),
  numDownloads: z.number().optional().describe('Number of file downloads'),
  wasReplied: z.boolean().optional().describe('Whether recipient replied'),
  wasBounced: z.boolean().optional().describe('Whether the email bounced'),
  lastEventType: z.string().optional().describe('Type of the last event'),
  lastEventAt: z.number().optional().describe('Timestamp of the last event (ms)'),
  permalink: z.string().optional().describe('Permalink to the message')
});

export let getLiveFeed = SlateTool.create(spec, {
  name: 'Get Live Feed',
  key: 'get_live_feed',
  description: `Retrieve the live feed of email activity. Shows sent messages with engagement data including opens, clicks, downloads, replies, and bounces. Supports filtering by search query.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter the feed'),
      timezone: z.string().optional().describe('Timezone for dates (default: UTC)'),
      limit: z.number().optional().describe('Maximum results (default: 50, max: 10000)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      messages: z.array(liveFeedMessageSchema).describe('Live feed messages'),
      stats: z.any().optional().describe('Aggregate statistics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getLiveFeed({
      query: ctx.input.query,
      timezone: ctx.input.timezone,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let results = data.results || data.messages || data || [];
    if (!Array.isArray(results)) results = [];

    let messages = results.map((m: any) => ({
      messageId: m._id,
      fromEmail: m.fromEmail,
      fromName: m.fromName,
      subject: m.subject,
      recipients: m.recipients,
      sent: m.sent,
      numOpens: m.numOpens,
      numClicks: m.numClicks,
      numDownloads: m.numDownloads,
      wasReplied: m.wasReplied,
      wasBounced: m.wasBounced,
      lastEventType: m.lastEventType,
      lastEventAt: m.lastEventAt,
      permalink: m.permalink
    }));

    return {
      output: {
        messages,
        stats: data.stats
      },
      message: `Retrieved ${messages.length} live feed message(s).`
    };
  })
  .build();
