import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let splitSentencesTool = SlateTool.create(spec, {
  name: 'Split Sentences',
  key: 'split_sentences',
  description: `Splits text into individual sentences. Useful for preprocessing text before further NLP analysis, or for breaking large documents into sentence-level units.`,
  constraints: ['Maximum payload size is 600KB with a maximum of 50,000 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text to split into sentences'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code. Auto-detected if not specified.')
    })
  )
  .output(
    z.object({
      sentences: z.array(z.string()).describe('List of detected sentences')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.detectSentences(ctx.input.content, ctx.input.language);

    let sentences = result.sentences ?? [];

    return {
      output: {
        sentences
      },
      message: `Split text into **${sentences.length}** sentence${sentences.length === 1 ? '' : 's'}.`
    };
  })
  .build();
