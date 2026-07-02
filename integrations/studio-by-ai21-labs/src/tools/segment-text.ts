import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let segmentText = SlateTool.create(spec, {
  name: 'Segment Text',
  key: 'segment_text',
  description: `Break long text into paragraphs segmented by distinct topics. Each segment represents a coherent topical unit. Can also process content from a URL.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      source: z.string().describe('Text to segment or a URL to fetch and segment'),
      sourceType: z.enum(['TEXT', 'URL']).describe('Whether the source is raw text or a URL')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentText: z.string().describe('Content of this segment'),
            segmentType: z.string().optional().describe('Type of segment')
          })
        )
        .describe('List of text segments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.segmentText({
      source: ctx.input.source,
      sourceType: ctx.input.sourceType
    });

    let segments = (result.segments ?? []).map((s: any) => ({
      segmentText: s.segment_text ?? s.segmentText ?? '',
      segmentType: s.segment_type ?? s.segmentType
    }));

    return {
      output: { segments },
      message: `Split content into **${segments.length}** topical segment(s).`
    };
  })
  .build();
