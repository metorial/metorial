import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let createSource = SlateTool.create(spec, {
  name: 'Create Source',
  key: 'create_source',
  description: `Add a new training source to a bot. Supports URL, sitemap, YouTube, RSS, Q&A pairs, and file-based sources. For file uploads, first use the **Get Upload URL** tool to obtain a presigned URL, upload the file, then pass the returned file path here.`,
  instructions: [
    'For "url", "sitemap", "youtube", and "rss" types, provide the url field.',
    'For "document", "urls", "csv", and "wp" types, provide the file field (cloud storage path from Get Upload URL).',
    'For "qa" type, provide faqs as an array of {question, answer} objects.',
    'For "document" type, also provide a title.'
  ]
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID to add source to'),
      type: z
        .enum(['url', 'document', 'sitemap', 'wp', 'urls', 'csv', 'rss', 'qa', 'youtube'])
        .describe('Source type'),
      title: z.string().optional().describe('Source title (required for "document" type)'),
      url: z
        .string()
        .optional()
        .describe('Source URL (required for url, sitemap, youtube, rss types)'),
      file: z
        .string()
        .optional()
        .describe(
          'Cloud storage path from Get Upload URL (required for document, urls, csv, wp types)'
        ),
      faqs: z
        .array(
          z.object({
            question: z.string().describe('FAQ question'),
            answer: z.string().describe('FAQ answer')
          })
        )
        .optional()
        .describe('Q&A pairs (required for "qa" type)'),
      scheduleInterval: z
        .enum(['daily', 'weekly', 'monthly', 'none'])
        .optional()
        .describe('Automatic refresh schedule')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('Created source identifier'),
      type: z.string().describe('Source type'),
      status: z.string().describe('Source status (typically "pending" after creation)'),
      title: z.string().optional().describe('Source title'),
      url: z.string().optional().describe('Source URL'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);

    let source = await client.createSource(ctx.config.teamId, ctx.input.botId, {
      type: ctx.input.type,
      title: ctx.input.title,
      url: ctx.input.url,
      file: ctx.input.file,
      faqs: ctx.input.faqs,
      scheduleInterval: ctx.input.scheduleInterval
    });

    return {
      output: {
        sourceId: source.id,
        type: source.type,
        status: source.status,
        title: source.title,
        url: source.url,
        createdAt: source.createdAt
      },
      message: `Created **${source.type}** source (ID: \`${source.id}\`, status: ${source.status})`
    };
  })
  .build();
