import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let detectGender = SlateTool.create(spec, {
  name: 'Detect Gender',
  key: 'detect_gender',
  description: `Predict the gender of a person from a first name, full name, email address, or social media username. Returns a gender prediction (\`male\`, \`female\`, or \`null\`) along with a confidence probability score and detected country.

Specify exactly one of **name**, **email**, or **username** as the input source. Optionally provide a country code to improve accuracy for region-specific names (e.g., "Andrea" is male in Italy but female elsewhere).`,
  instructions: [
    'Provide exactly one of name, email, or username per request.',
    'Use the country parameter with an ISO 3166-1 alpha-2 code (e.g., "IT", "US", "DE") for region-specific accuracy.',
    'Enable askToAI for uncommon names or non-Latin scripts like Chinese, Hindi, or Arabic.',
    'Enable forceToGenderize for nicknames or fantasy names (not available for email input).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('First name or full name to analyze'),
      email: z
        .string()
        .optional()
        .describe('Email address to extract a name from and analyze'),
      username: z
        .string()
        .optional()
        .describe('Social media username or display name to analyze'),
      country: z
        .string()
        .optional()
        .describe('Two-letter ISO 3166-1 alpha-2 country code for improved accuracy'),
      askToAI: z
        .boolean()
        .optional()
        .describe('Use AI models when name is not found in the database'),
      forceToGenderize: z
        .boolean()
        .optional()
        .describe(
          'Attempt gender prediction for non-standard inputs like nicknames (not available for email)'
        )
    })
  )
  .output(
    z.object({
      query: z.string().describe('The original input query'),
      extractedName: z.string().describe('The name used for gender prediction'),
      gender: z
        .string()
        .nullable()
        .describe('Predicted gender: "male", "female", or null if undetermined'),
      probability: z.number().describe('Confidence percentage (0-100)'),
      country: z.string().describe('Country code used for the prediction'),
      totalNames: z
        .number()
        .describe('Number of samples in the database used for the prediction'),
      usedCredits: z.number().describe('Number of API credits consumed'),
      remainingCredits: z.number().describe('Number of API credits remaining')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let inputCount = [ctx.input.name, ctx.input.email, ctx.input.username].filter(
      Boolean
    ).length;
    if (inputCount === 0) {
      throw new Error('Provide exactly one of name, email, or username.');
    }
    if (inputCount > 1) {
      throw new Error('Provide only one of name, email, or username per request.');
    }

    let result: any;
    let sourceType: string;

    if (ctx.input.name) {
      sourceType = 'name';
      result = await client.detectGenderFromName({
        name: ctx.input.name,
        country: ctx.input.country,
        askToAI: ctx.input.askToAI,
        forceToGenderize: ctx.input.forceToGenderize
      });
    } else if (ctx.input.email) {
      sourceType = 'email';
      result = await client.detectGenderFromEmail({
        email: ctx.input.email,
        country: ctx.input.country,
        askToAI: ctx.input.askToAI
      });
    } else {
      sourceType = 'username';
      result = await client.detectGenderFromUsername({
        username: ctx.input.username!,
        country: ctx.input.country,
        askToAI: ctx.input.askToAI,
        forceToGenderize: ctx.input.forceToGenderize
      });
    }

    let genderLabel =
      result.gender === 'male'
        ? 'male'
        : result.gender === 'female'
          ? 'female'
          : 'undetermined';

    return {
      output: {
        query: result.q,
        extractedName: result.name,
        gender: result.gender,
        probability: result.probability,
        country: result.country,
        totalNames: result.totalNames,
        usedCredits: result.usedCredits,
        remainingCredits: result.remainingCredits
      },
      message: `Gender detected from ${sourceType} **"${result.q}"**: **${genderLabel}** (${result.probability}% confidence). Extracted name: "${result.name}".`
    };
  })
  .build();
