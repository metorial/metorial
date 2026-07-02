import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkSpelling = SlateTool.create(spec, {
  name: 'Check Spelling',
  key: 'check_spelling',
  description: `Check text for spelling errors and get correction suggestions. Returns a list of misspelled words with suggested replacements. Useful for content quality checks, form input validation, and text processing pipelines.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text to check for spelling errors')
    })
  )
  .output(
    z.object({
      passed: z.boolean().describe('Whether the text passed the spell check with no errors'),
      misspellingCount: z.number().describe('Number of misspellings found'),
      corrections: z
        .array(
          z.object({
            word: z.string().describe('The misspelled word'),
            suggestions: z.array(z.string()).describe('Suggested correct spellings')
          })
        )
        .describe('List of misspelled words with suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.checkSpelling(ctx.input.text);

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'Spell check failed');
    }

    let data = result.data;
    let output = {
      passed: data.spellPass,
      misspellingCount: data.mispellingsFound,
      corrections: data.corrections ?? []
    };

    if (data.spellPass) {
      return {
        output,
        message: 'No spelling errors found.'
      };
    }

    let correctionList = (data.corrections ?? [])
      .slice(0, 5)
      .map(c => `\`${c.word}\` → ${c.suggestions.slice(0, 3).join(', ')}`)
      .join('; ');

    return {
      output,
      message: `Found **${data.mispellingsFound}** misspelling(s): ${correctionList}.`
    };
  })
  .build();
