import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let factCheck = SlateTool.create(spec, {
  name: 'Fact Check',
  key: 'fact_check',
  description: `Verifies the factual accuracy of content by extracting claims and checking them against trusted sources. Returns an overall accuracy score (0-100), and for each claim provides a verdict (SUPPORTED, PARTIALLY_SUPPORTED, NOT_ENOUGH_EVIDENCE, or REFUTED), a confidence score, an explanation, and reference links.

Accepts plain text, a publicly accessible file URL (.pdf, .doc, .docx), or a website URL. Supports 38+ languages with auto-detection. Extracts up to 12 claims per request.`,
  instructions: [
    'Provide exactly one of: text, fileUrl, or websiteUrl. If multiple are provided, websiteUrl takes priority over fileUrl, which takes priority over text.'
  ],
  constraints: [
    'Text must be between 300 and 10,000 characters.',
    'Maximum 12 claims extracted per request.',
    'Costs 2 credits per word processed.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      text: z
        .string()
        .optional()
        .describe('Plain text content to fact-check (300-10,000 characters)'),
      fileUrl: z
        .string()
        .optional()
        .describe('Publicly accessible URL to a .pdf, .doc, or .docx file'),
      websiteUrl: z.string().optional().describe('Public website URL to scan'),
      language: z
        .string()
        .optional()
        .describe('Two-letter language code (e.g. "en", "fr"), or "auto" for auto-detection')
    })
  )
  .output(
    z.object({
      accuracyScore: z
        .number()
        .describe(
          'Overall accuracy confidence score (0-100). Higher means more factually accurate'
        ),
      claimsCount: z.number().describe('Total number of claims extracted from the content'),
      claims: z
        .array(
          z.object({
            claimId: z.number().describe('Unique identifier for the claim'),
            sentence: z.string().describe('The original sentence containing the claim'),
            claim: z.string().describe('The extracted factual claim'),
            verdict: z
              .string()
              .describe(
                'Fact-check verdict: SUPPORTED, PARTIALLY_SUPPORTED, NOT_ENOUGH_EVIDENCE, or REFUTED'
              ),
            confidenceScore: z.number().describe('Confidence score for this claim (0-100)'),
            explanation: z.string().describe('Explanation of the fact-check verdict'),
            referenceLinks: z
              .array(
                z.object({
                  url: z.string().describe('URL of the reference source'),
                  title: z.string().describe('Title of the reference source')
                })
              )
              .describe('Supporting reference links')
          })
        )
        .describe('List of extracted claims with fact-check results'),
      sentences: z
        .array(
          z.object({
            sentenceId: z.number().describe('Unique identifier for the sentence'),
            text: z.string().describe('Sentence text')
          })
        )
        .describe('Sentences from the analyzed text, with IDs for mapping to claims'),
      inputType: z.string().describe('Input type used: text, file, or website'),
      language: z.string().describe('Detected or specified language code'),
      wordCount: z.number().describe('Word count of the analyzed content'),
      creditsUsed: z.number().describe('Number of credits consumed'),
      creditsRemaining: z.number().describe('Remaining account credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.factCheck({
      text: ctx.input.text,
      file: ctx.input.fileUrl,
      website: ctx.input.websiteUrl,
      language: ctx.input.language
    });

    let claims = (result.claims ?? []).map(c => ({
      claimId: c.id,
      sentence: c.sentence,
      claim: c.claim,
      verdict: c.verdict,
      confidenceScore: c.score,
      explanation: c.explanation,
      referenceLinks: (c.links ?? []).map(l => ({
        url: l.url,
        title: l.title
      }))
    }));

    let sentences = (result.sentences ?? []).map(s => ({
      sentenceId: s.id,
      text: s.text
    }));

    let supportedCount = claims.filter(c => c.verdict === 'SUPPORTED').length;
    let refutedCount = claims.filter(c => c.verdict === 'REFUTED').length;

    return {
      output: {
        accuracyScore: result.score,
        claimsCount: result.claimsCount,
        claims,
        sentences,
        inputType: result.input,
        language: result.language,
        wordCount: result.wordCount,
        creditsUsed: result.creditsUsed,
        creditsRemaining: result.creditsRemaining
      },
      message: `Fact check complete. **Accuracy score: ${result.score}/100**. Extracted ${result.claimsCount} claim(s): ${supportedCount} supported, ${refutedCount} refuted, ${result.claimsCount - supportedCount - refutedCount} other. Credits used: ${result.creditsUsed}.`
    };
  });
