import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cleanUpText = SlateTool.create(spec, {
  name: 'Clean Up Text',
  key: 'clean_up_text',
  description: `Removes JavaScript, CSS tags, JSON, and other markup from text, returning pure decoded plaintext. Useful for preprocessing HTML or markup-heavy content before analysis.`,
  constraints: ['Does not process binary content.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The markup content (HTML, etc.) to clean up')
    })
  )
  .output(
    z.object({
      cleanedText: z
        .string()
        .describe('Pure plaintext with all markup, scripts, styles, and JSON removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let cleaned = await client.cleanUpText(ctx.input.content);

    return {
      output: { cleanedText: cleaned },
      message: `Markup removed. Extracted **${cleaned.length}** characters of clean text.`
    };
  })
  .build();
