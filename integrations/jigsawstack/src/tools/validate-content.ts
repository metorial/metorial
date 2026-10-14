import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let outputSchema = z.object({
  rawResponses: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Complete responses for the selected provider checks'),
  spelling: z
    .object({
      misspellingsFound: z.boolean().describe('Whether spelling errors were detected'),
      misspellings: z
        .array(
          z.object({
            word: z.string(),
            startIndex: z.number(),
            endIndex: z.number(),
            expected: z.array(z.string())
          })
        )
        .optional()
        .describe('List of misspelled words with suggestions'),
      autoCorrectedText: z.string().optional().describe('Auto-corrected version of the text')
    })
    .optional()
    .describe('Spell check results (only if checkSpelling was true)'),
  profanity: z
    .object({
      profanitiesFound: z.boolean().describe('Whether profanity was detected'),
      profanities: z
        .array(
          z.object({
            profanity: z.string(),
            startIndex: z.number(),
            endIndex: z.number()
          })
        )
        .optional()
        .describe('Detected profanities with positions'),
      cleanText: z.string().optional().describe('Text with profanities censored')
    })
    .optional()
    .describe('Profanity check results (only if checkProfanity was true)'),
  spam: z
    .object({
      isSpam: z.boolean().describe('Whether the text is classified as spam'),
      score: z.number().describe('Spam likelihood score (lower = less likely spam)')
    })
    .optional()
    .describe('Spam check results (only if checkSpam was true)')
});

export let validateContent = SlateTool.create(spec, {
  name: 'Validate Content',
  key: 'validate_content',
  description: `Validate text content for quality and safety issues. Combines spell checking, profanity detection, and spam detection into a single tool. Choose which checks to run. Returns detailed results for each enabled check including corrections, flagged words, and spam scores.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('Text content to validate'),
      checkSpelling: z.boolean().optional().describe('Run spell check (default: false)'),
      checkProfanity: z
        .boolean()
        .optional()
        .describe('Run profanity detection (default: false)'),
      checkSpam: z.boolean().optional().describe('Run spam detection (default: false)'),
      languageCode: z
        .string()
        .optional()
        .describe('Language code for spell checking (default: "en")'),
      censorReplacement: z
        .string()
        .optional()
        .describe('Character to replace profanity with (default: "*")')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    if (!ctx.input.checkSpelling && !ctx.input.checkProfanity && !ctx.input.checkSpam) {
      throw createApiServiceError(
        'Enable at least one content check: spelling, profanity, or spam.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let output: z.infer<typeof outputSchema> = {};
    let checks: string[] = [];
    let rawResponses: Record<string, unknown> = {};

    if (ctx.input.checkSpelling) {
      let result = await client.checkSpelling({
        text: ctx.input.text,
        languageCode: ctx.input.languageCode
      });
      output.spelling = {
        misspellingsFound: result.misspellings_found,
        misspellings: result.misspellings?.map(item => ({
          ...item,
          word: item.word ?? ctx.input.text.slice(item.startIndex, item.endIndex)
        })),
        autoCorrectedText: result.auto_correct_text
      };
      rawResponses.spelling = result;
      checks.push('spelling');
    }

    if (ctx.input.checkProfanity) {
      let result = await client.checkProfanity({
        text: ctx.input.text,
        censorReplacement: ctx.input.censorReplacement
      });
      output.profanity = {
        profanitiesFound: result.profanities_found,
        profanities: result.profanities?.map(item => ({
          ...item,
          profanity: item.profanity ?? ctx.input.text.slice(item.startIndex, item.endIndex)
        })),
        cleanText: result.clean_text
      };
      rawResponses.profanity = result;
      checks.push('profanity');
    }

    if (ctx.input.checkSpam) {
      let result = await client.checkSpam({ text: ctx.input.text });
      let check = result.check;
      if (Array.isArray(check)) check = check[0]!;
      output.spam = {
        isSpam: check.is_spam,
        score: check.score
      };
      rawResponses.spam = result;
      checks.push('spam');
    }

    let issues: string[] = [];
    if (output.spelling?.misspellingsFound) issues.push('spelling errors');
    if (output.profanity?.profanitiesFound) issues.push('profanity');
    if (output.spam?.isSpam) issues.push('spam');

    return {
      output: { ...output, rawResponses },
      message: `Ran **${checks.join(', ')}** checks.${issues.length > 0 ? ` Issues found: ${issues.join(', ')}.` : ' No issues found.'}`
    };
  })
  .build();
