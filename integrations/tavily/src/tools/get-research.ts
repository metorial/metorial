import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { MAX_BYTES, requireValue } from '../lib/contracts';
import { spec } from '../spec';

export const getResearch = SlateTool.create(spec, {
  key: 'get_research',
  name: 'Get Research',
  description:
    'Read the exact native status and result of an existing research request. Optionally download a completed report as Markdown or JSON without starting another research task.',
  constraints: [
    'Pending and failed requests have no completed report to download.',
    'Markdown requires a text report; use JSON for structured reports. Downloads are limited to 8 MiB.',
    'Reading a request does not cancel it or erase retained research history.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      requestId: z.string().describe('Exact native request ID returned by Research'),
      downloadFormat: z
        .enum(['markdown', 'json'])
        .optional()
        .describe('Download the completed report rather than returning its content inline')
    })
  )
  .output(
    z.object({
      requestId: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
      createdAt: z.string().optional(),
      responseTime: z.number(),
      usageCredits: z.number().optional(),
      content: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
      sources: z
        .array(
          z.object({ title: z.string(), url: z.string(), favicon: z.string().optional() })
        )
        .optional(),
      filename: z.string().optional(),
      mimeType: z.string().optional(),
      sizeBytes: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    }).getResearch(ctx.input.requestId);
    if (!ctx.input.downloadFormat)
      return {
        output: result,
        message: `Research request ${result.requestId} is ${result.status}.`
      };
    requireValue(
      result.status === 'completed' && result.content !== undefined,
      'Only a completed research report can be downloaded. Read its current status before retrying.'
    );
    requireValue(
      ctx.input.downloadFormat !== 'markdown' || typeof result.content === 'string',
      'This report is structured. Select JSON to download it.'
    );
    const markdown = ctx.input.downloadFormat === 'markdown';
    const text = markdown
      ? (result.content as string)
      : JSON.stringify(
          {
            requestId: result.requestId,
            createdAt: result.createdAt,
            content: result.content,
            sources: result.sources,
            usageCredits: result.usageCredits
          },
          null,
          2
        );
    const sizeBytes = Buffer.byteLength(text),
      mimeType = markdown ? 'text/markdown; charset=utf-8' : 'application/json; charset=utf-8',
      filename = `research-${result.requestId}.${markdown ? 'md' : 'json'}`;
    requireValue(
      sizeBytes <= MAX_BYTES,
      'The completed report exceeds the 8 MiB download limit.'
    );
    await ctx.addAttachment({
      type: 'content',
      filename,
      mimeType,
      content: new Response(text, { headers: { 'content-type': mimeType } })
    });
    return {
      output: { ...result, content: undefined, filename, mimeType, sizeBytes },
      message: `Completed research report is ready to download as ${filename}.`
    };
  })
  .build();
