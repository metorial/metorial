import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

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
  .output(
    z.object({
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
          autoCorrectedText: z
            .string()
            .optional()
            .describe('Auto-corrected version of the text')
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let output: Record<string, unknown> = {};
    let checks: string[] = [];

    if (ctx.input.checkSpelling) {
      let result = await client.checkSpelling({
        text: ctx.input.text,
        languageCode: ctx.input.languageCode
      });
      output.spelling = {
        misspellingsFound: result.misspellings_found,
        misspellings: result.misspellings,
        autoCorrectedText: result.auto_correct_text
      };
      checks.push('spelling');
    }

    if (ctx.input.checkProfanity) {
      let result = await client.checkProfanity({
        text: ctx.input.text,
        censorReplacement: ctx.input.censorReplacement
      });
      output.profanity = {
        profanitiesFound: result.profanities_found,
        profanities: result.profanities,
        cleanText: result.clean_text
      };
      checks.push('profanity');
    }

    if (ctx.input.checkSpam) {
      let result = await client.checkSpam({ text: ctx.input.text });
      let check = result.check;
      if (Array.isArray(check)) check = check[0];
      output.spam = {
        isSpam: check?.is_spam ?? false,
        score: check?.score ?? 0
      };
      checks.push('spam');
    }

    let issues: string[] = [];
    if (output.spelling && (output.spelling as Record<string, unknown>).misspellingsFound)
      issues.push('spelling errors');
    if (output.profanity && (output.profanity as Record<string, unknown>).profanitiesFound)
      issues.push('profanity');
    if (output.spam && (output.spam as Record<string, unknown>).isSpam) issues.push('spam');

    return {
      output: output as any,
      message: `Ran **${checks.join(', ')}** checks.${issues.length > 0 ? ` Issues found: ${issues.join(', ')}.` : ' No issues found.'}`
    };
  })
  .build();
