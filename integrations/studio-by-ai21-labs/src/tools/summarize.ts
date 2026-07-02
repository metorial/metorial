import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let summarize = SlateTool.create(spec, {
  name: 'Summarize Text',
  key: 'summarize',
  description: `Generate a grounded summary of text or a web page URL. The summary stays faithful to the original content. Optionally focus the summary on a specific topic or keyword.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      source: z.string().describe('Text to summarize or a URL to fetch and summarize'),
      sourceType: z.enum(['TEXT', 'URL']).describe('Whether the source is raw text or a URL'),
      focus: z.string().optional().describe('Keyword or topic to focus the summary on')
    })
  )
  .output(
    z.object({
      summary: z.string().describe('Generated summary')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.summarize({
      source: ctx.input.source,
      sourceType: ctx.input.sourceType,
      focus: ctx.input.focus
    });

    let summary = result.summary ?? '';

    return {
      output: { summary },
      message: `Generated summary (${summary.length} chars):\n\n> ${summary.substring(0, 300)}${summary.length > 300 ? '...' : ''}`
    };
  })
  .build();
