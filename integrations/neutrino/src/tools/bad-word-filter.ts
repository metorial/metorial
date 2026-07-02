import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let badWordFilterTool = SlateTool.create(spec, {
  name: 'Bad Word Filter',
  key: 'bad_word_filter',
  description: `Detect and censor profanity in text content using NLP. Handles obfuscation techniques like leetspeak and character substitution. Choose "strict" for all audiences (including children) or "obscene" for adult-only filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('Text content to scan for bad words'),
      censorCharacter: z
        .string()
        .optional()
        .describe(
          'Character to replace bad words with (e.g., "*"). If omitted, no censored version is returned.'
        ),
      catalog: z
        .enum(['strict', 'obscene'])
        .optional()
        .describe(
          'Word catalog: "strict" (comprehensive, suitable for children) or "obscene" (adult-only, excludes mild language)'
        )
    })
  )
  .output(
    z.object({
      isBad: z.boolean().describe('Whether bad words were detected'),
      badWordsTotal: z.number().describe('Total count of bad words found'),
      badWordsList: z.array(z.string()).describe('List of detected bad words'),
      censoredContent: z
        .string()
        .describe('Content with bad words replaced (only if censorCharacter was provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.badWordFilter({
      content: ctx.input.content,
      censorCharacter: ctx.input.censorCharacter,
      catalog: ctx.input.catalog
    });

    return {
      output: {
        isBad: result.isBad ?? false,
        badWordsTotal: result.badWordsTotal ?? 0,
        badWordsList: result.badWordsList ?? [],
        censoredContent: result.censoredContent ?? ''
      },
      message: result.isBad
        ? `⚠️ Detected **${result.badWordsTotal}** bad word(s) in the content.${result.censoredContent ? ' Censored version available.' : ''}`
        : `✅ No bad words detected in the content.`
    };
  })
  .build();
