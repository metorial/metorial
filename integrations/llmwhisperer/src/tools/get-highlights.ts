import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getHighlights = SlateTool.create(spec, {
  name: 'Get Highlights',
  key: 'get_highlights',
  description: `Retrieve bounding box coordinates for extracted text lines. Use this to highlight or locate specific lines in the original document.
Requires that the extraction was performed with \`addLineNos\` enabled.`,
  instructions: [
    'The "lines" parameter follows the format "1-5,7,21-" to specify which lines to get coordinates for.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      whisperHash: z.string().describe('The whisper hash of the extraction job.'),
      lines: z
        .string()
        .describe('Line numbers to retrieve highlight data for (e.g., "1-5,7,21-").')
    })
  )
  .output(
    z.object({
      lineHighlights: z
        .record(
          z.string(),
          z.object({
            baseY: z.number().describe('Y-coordinate of the line bounding box.'),
            baseYPercent: z.number().describe('Y-coordinate as a percentage of page height.'),
            height: z.number().describe('Height of the bounding box in pixels.'),
            heightPercent: z.number().describe('Height as a percentage of page height.'),
            page: z.number().describe('Page number the line is on.'),
            pageHeight: z.number().describe('Total height of the page.'),
            raw: z
              .array(z.number())
              .describe('Raw bounding box data: [page_no, y, height, max_height].')
          })
        )
        .describe('Highlight data keyed by line number.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let highlights = await client.getHighlights(ctx.input.whisperHash, ctx.input.lines);
    let lineCount = Object.keys(highlights).length;

    return {
      output: { lineHighlights: highlights },
      message: `Retrieved highlight data for **${lineCount}** line(s).`
    };
  })
  .build();
