import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let nameEntrySchema = z.object({
  name: z.string().describe('First name or full name to analyze'),
  country: z.string().optional().describe('Two-letter ISO 3166-1 alpha-2 country code'),
  referenceId: z
    .string()
    .optional()
    .describe('Your own custom ID to match results back to your records')
});

let emailEntrySchema = z.object({
  email: z.string().describe('Email address to extract a name from and analyze'),
  country: z.string().optional().describe('Two-letter ISO 3166-1 alpha-2 country code'),
  referenceId: z
    .string()
    .optional()
    .describe('Your own custom ID to match results back to your records')
});

let usernameEntrySchema = z.object({
  username: z.string().describe('Social media username or display name to analyze'),
  country: z.string().optional().describe('Two-letter ISO 3166-1 alpha-2 country code'),
  referenceId: z
    .string()
    .optional()
    .describe('Your own custom ID to match results back to your records')
});

let genderResultSchema = z.object({
  query: z.string().describe('The original input value'),
  extractedName: z.string().describe('The name used for gender prediction'),
  gender: z
    .string()
    .nullable()
    .describe('Predicted gender: "male", "female", or null if undetermined'),
  probability: z.number().describe('Confidence percentage (0-100)'),
  country: z.string().describe('Country code used for the prediction'),
  totalNames: z.number().describe('Number of samples used for prediction'),
  referenceId: z.string().optional().describe('Your custom ID echoed back for matching')
});

export let detectGenderBulk = SlateTool.create(spec, {
  name: 'Detect Gender (Bulk)',
  key: 'detect_gender_bulk',
  description: `Predict gender for multiple names, email addresses, or usernames in a single request. Returns gender predictions with confidence scores for each entry.

Provide exactly one of **names**, **emails**, or **usernames** as the input source. Each entry can include an optional country code and a custom reference ID for matching results to your records.`,
  instructions: [
    'Provide exactly one of names, emails, or usernames per request — do not mix input types.',
    'Names support up to 100 entries per request; emails and usernames support up to 50.',
    'AI-based inference (askToAI) is not available for bulk requests. Use single detection for uncommon or non-Latin names.',
    'Use the referenceId field to correlate results with your own database records.'
  ],
  constraints: [
    'Maximum 100 names per request.',
    'Maximum 50 emails or usernames per request.',
    'AI fallback (askToAI) and forceToGenderize are not supported in bulk mode.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      names: z
        .array(nameEntrySchema)
        .optional()
        .describe('Array of name entries to analyze (max 100)'),
      emails: z
        .array(emailEntrySchema)
        .optional()
        .describe('Array of email entries to analyze (max 50)'),
      usernames: z
        .array(usernameEntrySchema)
        .optional()
        .describe('Array of username entries to analyze (max 50)')
    })
  )
  .output(
    z.object({
      results: z.array(genderResultSchema).describe('Array of gender prediction results'),
      usedCredits: z.number().describe('Total API credits consumed'),
      remainingCredits: z.number().describe('API credits remaining')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let inputCount = [ctx.input.names, ctx.input.emails, ctx.input.usernames].filter(
      Boolean
    ).length;
    if (inputCount === 0) {
      throw new Error('Provide exactly one of names, emails, or usernames.');
    }
    if (inputCount > 1) {
      throw new Error('Provide only one of names, emails, or usernames per request.');
    }

    let response: any;
    let sourceType: string;

    if (ctx.input.names) {
      sourceType = 'names';
      response = await client.detectGenderFromNamesBulk({
        data: ctx.input.names.map(entry => ({
          name: entry.name,
          country: entry.country,
          id: entry.referenceId
        }))
      });
    } else if (ctx.input.emails) {
      sourceType = 'emails';
      response = await client.detectGenderFromEmailsBulk({
        data: ctx.input.emails.map(entry => ({
          email: entry.email,
          country: entry.country,
          id: entry.referenceId
        }))
      });
    } else {
      sourceType = 'usernames';
      response = await client.detectGenderFromUsernamesBulk({
        data: ctx.input.usernames!.map(entry => ({
          username: entry.username,
          country: entry.country,
          id: entry.referenceId
        }))
      });
    }

    let results = response.names.map((n: any) => ({
      query: n.q,
      extractedName: n.name,
      gender: n.gender,
      probability: n.probability,
      country: n.country,
      totalNames: n.totalNames,
      referenceId: n.id
    }));

    let maleCount = results.filter((r: any) => r.gender === 'male').length;
    let femaleCount = results.filter((r: any) => r.gender === 'female').length;
    let unknownCount = results.filter((r: any) => !r.gender).length;

    return {
      output: {
        results,
        usedCredits: response.usedCredits,
        remainingCredits: response.remainingCredits
      },
      message: `Bulk gender detection completed for **${results.length}** ${sourceType}: **${maleCount}** male, **${femaleCount}** female, **${unknownCount}** undetermined.`
    };
  })
  .build();
