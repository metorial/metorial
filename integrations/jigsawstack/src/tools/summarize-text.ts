import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let summarizeText = SlateTool.create(spec, {
  name: 'Summarize Text',
  key: 'summarize_text',
  description: `Generate concise summaries from text, URLs, or uploaded PDF files. Supports paragraph-style summaries or bullet-point lists. Provide exactly one content source: direct text, a URL to a PDF, or a file store key.`,
  constraints: [
    'Text input supports up to 300,000 characters.',
    'Maximum 100 bullet points when using "points" type.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z
        .string()
        .optional()
        .describe('Text content to summarize (up to 300,000 characters)'),
      url: z.string().optional().describe('URL to a PDF document to summarize'),
      fileStoreKey: z
        .string()
        .optional()
        .describe('File store key of a previously uploaded PDF'),
      type: z
        .enum(['text', 'points'])
        .optional()
        .describe(
          'Summary format: "text" for paragraph or "points" for bullet points (default: "text")'
        ),
      maxPoints: z
        .number()
        .optional()
        .describe(
          'Maximum number of bullet points (default: 2, max: 100). Only used when type is "points".'
        ),
      maxCharacters: z.number().optional().describe('Character limit for the summary')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      summary: z
        .union([z.string(), z.array(z.string())])
        .describe('Summary as a paragraph string or array of bullet points')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.summarizeText({
      text: ctx.input.text,
      url: ctx.input.url,
      fileStoreKey: ctx.input.fileStoreKey,
      type: ctx.input.type,
      maxPoints: ctx.input.maxPoints,
      maxCharacters: ctx.input.maxCharacters
    });

    let source = ctx.input.url ? 'URL' : ctx.input.fileStoreKey ? 'file' : 'text';
    let format = ctx.input.type === 'points' ? 'bullet points' : 'paragraph';

    return {
      output: {
        success: result.success,
        summary: result.summary
      },
      message: `Generated ${format} summary from ${source}.`
    };
  })
  .build();
