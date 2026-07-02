import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addChannelDataPoint = SlateTool.create(spec, {
  name: 'Add Channel Data Point',
  key: 'add_channel_data_point',
  description: `Submit a feedback data point to a channel for AI-powered analysis and topic classification. Use this to ingest individual pieces of feedback (e.g., a support ticket, app review, or survey response) into a channel.`,
  constraints: [
    'Text content can be up to 5,000,000 characters.',
    'Source title is limited to 100 characters.',
    'Source URL is limited to 5,000 characters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('The channel ID to add the data point to'),
      text: z.string().describe('The feedback text content to be analyzed and classified'),
      timestamp: z
        .string()
        .describe('ISO 8601 timestamp of when the feedback was originally created'),
      sourceTitle: z
        .string()
        .optional()
        .describe('Title of the feedback source (e.g., ticket subject, review title)'),
      sourceUrl: z
        .string()
        .optional()
        .describe('URL linking back to the original feedback source'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional metadata key-value pairs to attach')
    })
  )
  .output(
    z.object({
      dataPointId: z.string(),
      channelId: z.string(),
      timestamp: z.string(),
      createdAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createChannelDataPoint({
      channelId: ctx.input.channelId,
      text: ctx.input.text,
      timestamp: ctx.input.timestamp,
      sourceTitle: ctx.input.sourceTitle,
      sourceUrl: ctx.input.sourceUrl,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        dataPointId: result.id,
        channelId: result.channel.id,
        timestamp: result.timestamp,
        createdAt: result.created_at
      },
      message: `Added data point to channel **${result.channel.id}**${ctx.input.sourceTitle ? ` from "${ctx.input.sourceTitle}"` : ''}.`
    };
  })
  .build();
