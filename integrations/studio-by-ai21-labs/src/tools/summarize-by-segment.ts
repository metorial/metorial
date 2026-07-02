import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let summarizeBySegment = SlateTool.create(spec, {
  name: 'Summarize by Segment',
  key: 'summarize_by_segment',
  description: `Break text or a web page into logical segments and summarize each one individually. Useful for long documents where you need per-section summaries rather than one overall summary.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      source: z.string().describe('Text to segment and summarize, or a URL to fetch'),
      sourceType: z.enum(['TEXT', 'URL']).describe('Whether the source is raw text or a URL'),
      focus: z.string().optional().describe('Keyword or topic to focus the summaries on')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentText: z.string().describe('Original segment text'),
            summary: z.string().describe('Summary of the segment'),
            highlights: z
              .array(z.string())
              .optional()
              .describe('Key highlights from the segment')
          })
        )
        .describe('Summarized segments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.summarizeBySegment({
      source: ctx.input.source,
      sourceType: ctx.input.sourceType,
      focus: ctx.input.focus
    });

    let segments = (result.segments ?? []).map((s: any) => ({
      segmentText: s.segment_text ?? s.segmentText ?? '',
      summary: s.summary ?? '',
      highlights:
        s.highlights?.map((h: any) => (typeof h === 'string' ? h : h.text)) ?? undefined
    }));

    return {
      output: { segments },
      message: `Segmented content into **${segments.length}** segments with individual summaries.`
    };
  })
  .build();
