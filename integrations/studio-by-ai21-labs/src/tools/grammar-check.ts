import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let grammarCheck = SlateTool.create(spec, {
  name: 'Grammar Check',
  key: 'grammar_check',
  description: `Detect and suggest corrections for grammatical errors in text. Identifies issues including grammar, spelling, punctuation, missing words, wrong words, and word repetition.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Text to check for grammatical errors')
    })
  )
  .output(
    z.object({
      corrections: z
        .array(
          z.object({
            originalText: z.string().describe('Original text containing the error'),
            suggestion: z.string().describe('Suggested correction'),
            correctionType: z
              .string()
              .describe('Type of correction (e.g. Grammar, Spelling, Punctuation)'),
            startIndex: z.number().describe('Start character index of the error'),
            endIndex: z.number().describe('End character index of the error')
          })
        )
        .describe('List of corrections found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.grammarCheck({ text: ctx.input.text });

    let corrections = (result.corrections ?? []).map((c: any) => ({
      originalText: c.originalText ?? c.original_text ?? '',
      suggestion: c.suggestion ?? c.correctedText ?? c.corrected_text ?? '',
      correctionType: c.correctionType ?? c.correction_type ?? 'Unknown',
      startIndex: c.startIndex ?? c.start_index ?? 0,
      endIndex: c.endIndex ?? c.end_index ?? 0
    }));

    return {
      output: { corrections },
      message:
        corrections.length > 0
          ? `Found **${corrections.length}** grammatical issue(s): ${corrections
              .map((c: any) => `"${c.originalText}" → "${c.suggestion}" (${c.correctionType})`)
              .slice(0, 5)
              .join(', ')}${corrections.length > 5 ? '...' : ''}`
          : 'No grammatical errors found.'
    };
  })
  .build();
