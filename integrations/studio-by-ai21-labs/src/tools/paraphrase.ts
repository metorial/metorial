import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let paraphrase = SlateTool.create(spec, {
  name: 'Paraphrase Text',
  key: 'paraphrase',
  description: `Generate alternative phrasings of input text. Choose from different styles like casual, formal, short, long, or general. Optionally paraphrase only a subsection of the text using start and end indices.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Text to paraphrase'),
      style: z
        .enum(['general', 'casual', 'formal', 'short', 'long'])
        .optional()
        .describe('Paraphrasing style'),
      startIndex: z
        .number()
        .int()
        .optional()
        .describe('Start character index for subsection paraphrasing'),
      endIndex: z
        .number()
        .int()
        .optional()
        .describe('End character index for subsection paraphrasing')
    })
  )
  .output(
    z.object({
      suggestions: z
        .array(
          z.object({
            text: z.string().describe('Paraphrased text')
          })
        )
        .describe('List of paraphrase suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.paraphrase({
      text: ctx.input.text,
      style: ctx.input.style,
      startIndex: ctx.input.startIndex,
      endIndex: ctx.input.endIndex
    });

    let suggestions = (result.suggestions ?? []).map((s: any) => ({
      text: s.text ?? s
    }));

    return {
      output: { suggestions },
      message: `Generated **${suggestions.length}** paraphrase suggestion(s)${ctx.input.style ? ` in **${ctx.input.style}** style` : ''}.`
    };
  })
  .build();
