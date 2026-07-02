import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analyzeMorphologyTool = SlateTool.create(spec, {
  name: 'Analyze Morphology',
  key: 'analyze_morphology',
  description: `Performs morphological analysis on text, returning part of speech tags, lemmas (dictionary form), compound components, and Han readings for each token. Can return all features at once or individual features.`,
  tags: {
    readOnly: true
  },
  constraints: ['Maximum payload size is 600KB with a maximum of 50,000 characters.']
})
  .input(
    z.object({
      content: z.string().describe('The text to analyze'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code. Auto-detected if not specified.'),
      analysisType: z
        .enum(['complete', 'lemmas', 'parts-of-speech', 'compound-components', 'han-readings'])
        .default('complete')
        .describe('Type of morphological analysis to perform')
    })
  )
  .output(
    z.object({
      tokens: z.array(z.string()).optional().describe('Token strings'),
      posTags: z.array(z.string()).optional().describe('Part-of-speech tags for each token'),
      lemmas: z
        .array(z.string())
        .optional()
        .describe('Lemma (dictionary form) for each token'),
      compoundComponents: z
        .array(z.array(z.string()))
        .optional()
        .describe('Compound word components for each token'),
      hanReadings: z.array(z.string()).optional().describe('Han readings for each token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.morphology(
      ctx.input.content,
      ctx.input.analysisType,
      ctx.input.language
    );

    return {
      output: {
        tokens: result.tokens,
        posTags: result.posTags,
        lemmas: result.lemmas,
        compoundComponents: result.compoundComponents,
        hanReadings: result.hanReadings
      },
      message: `Morphological analysis (${ctx.input.analysisType}) completed for ${(result.tokens ?? []).length} tokens.`
    };
  })
  .build();
