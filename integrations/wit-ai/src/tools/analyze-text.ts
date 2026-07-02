import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let intentSchema = z.object({
  id: z.string().describe('Unique ID of the intent'),
  name: z.string().describe('Name of the intent'),
  confidence: z.number().describe('Confidence score between 0 and 1')
});

let entityValueSchema = z.object({
  id: z.string().optional().describe('Entity ID'),
  name: z.string().optional().describe('Entity name'),
  role: z.string().optional().describe('Role of the entity'),
  start: z.number().optional().describe('Start character position in the text'),
  end: z.number().optional().describe('End character position in the text'),
  body: z.string().optional().describe('Matched text segment'),
  confidence: z.number().optional().describe('Confidence score'),
  value: z.string().optional().describe('Resolved value'),
  type: z.string().optional().describe('Type of the entity value (e.g., "value", "interval")'),
  entities: z.array(z.any()).optional().describe('Sub-entities')
});

let traitValueSchema = z.object({
  id: z.string().optional().describe('Trait ID'),
  value: z.string().describe('Detected trait value'),
  confidence: z.number().describe('Confidence score')
});

export let analyzeText = SlateTool.create(spec, {
  name: 'Analyze Text',
  key: 'analyze_text',
  description: `Extract meaning from text using Wit.ai's NLU engine. Returns detected **intents**, **entities**, and **traits** with confidence scores. Supports optional context (locale, timezone, reference time) for improved entity resolution. Use the \`n\` parameter to get multiple candidate intents (N-best).`,
  instructions: [
    'Provide the text to analyze in the `text` field.',
    'Use the `context` fields to improve entity resolution for datetime, location, etc.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z
        .string()
        .describe('The text message to analyze for intents, entities, and traits'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of N-best intent/trait results to return'),
      locale: z
        .string()
        .optional()
        .describe(
          'Locale of the user (ISO639-1 language + underscore + ISO3166 alpha2 country, e.g., "en_US")'
        ),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone of the user (e.g., "America/Los_Angeles")'),
      referenceTime: z
        .string()
        .optional()
        .describe('ISO 8601 reference time for relative datetime resolution')
    })
  )
  .output(
    z.object({
      text: z.string().describe('The original input text'),
      intents: z.array(intentSchema).describe('Detected intents with confidence scores'),
      entities: z
        .record(z.string(), z.array(entityValueSchema))
        .describe('Detected entities grouped by entity name'),
      traits: z
        .record(z.string(), z.array(traitValueSchema))
        .describe('Detected traits grouped by trait name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let context: Record<string, unknown> | undefined;
    if (ctx.input.locale || ctx.input.timezone || ctx.input.referenceTime) {
      context = {};
      if (ctx.input.locale) context.locale = ctx.input.locale;
      if (ctx.input.timezone) context.timezone = ctx.input.timezone;
      if (ctx.input.referenceTime) context.reference_time = ctx.input.referenceTime;
    }

    let result = await client.message(ctx.input.text, {
      n: ctx.input.maxResults,
      context
    });

    let intentCount = result.intents?.length ?? 0;
    let entityCount = Object.keys(result.entities ?? {}).length;
    let traitCount = Object.keys(result.traits ?? {}).length;

    return {
      output: {
        text: result.text,
        intents: result.intents ?? [],
        entities: result.entities ?? {},
        traits: result.traits ?? {}
      },
      message: `Analyzed text: "${ctx.input.text}". Found **${intentCount}** intent(s), **${entityCount}** entity type(s), and **${traitCount}** trait(s).`
    };
  })
  .build();
