import { SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

let categoryResultSchema = z.object({
  categories: z.object({
    sexual: z.boolean().describe('Contains sexual content'),
    hateAndDiscrimination: z.boolean().describe('Contains hate or discrimination'),
    violenceAndThreats: z.boolean().describe('Contains violence or threats'),
    dangerousAndCriminalContent: z
      .boolean()
      .describe('Contains dangerous or criminal content'),
    selfharm: z.boolean().describe('Contains self-harm content'),
    health: z.boolean().describe('Contains health misinformation'),
    financial: z.boolean().describe('Contains financial misinformation'),
    law: z.boolean().describe('Contains legal misinformation'),
    pii: z.boolean().describe('Contains personally identifiable information')
  }),
  categoryScores: z.object({
    sexual: z.number().describe('Score for sexual content'),
    hateAndDiscrimination: z.number().describe('Score for hate/discrimination'),
    violenceAndThreats: z.number().describe('Score for violence/threats'),
    dangerousAndCriminalContent: z.number().describe('Score for dangerous/criminal content'),
    selfharm: z.number().describe('Score for self-harm'),
    health: z.number().describe('Score for health misinformation'),
    financial: z.number().describe('Score for financial misinformation'),
    law: z.number().describe('Score for legal misinformation'),
    pii: z.number().describe('Score for PII')
  })
});

export let moderateContentTool = SlateTool.create(spec, {
  name: 'Moderate Content',
  key: 'moderate_content',
  description: `Analyze text for harmful content across multiple safety categories. Returns boolean flags and confidence scores for categories including sexual content, hate/discrimination, violence, dangerous content, self-harm, health/financial/legal misinformation, and PII detection.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      input: z
        .union([z.string(), z.array(z.string())])
        .describe('Text or array of texts to moderate'),
      model: z.string().default('mistral-moderation-latest').describe('Moderation model ID')
    })
  )
  .output(
    z.object({
      moderationId: z.string().describe('Unique moderation request ID'),
      model: z.string().describe('Model used'),
      results: z.array(categoryResultSchema).describe('Moderation results for each input')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.moderate({
      model: ctx.input.model,
      input: ctx.input.input
    });

    let mapResult = (r: any) => ({
      categories: {
        sexual: r.categories?.sexual || false,
        hateAndDiscrimination: r.categories?.hate_and_discrimination || false,
        violenceAndThreats: r.categories?.violence_and_threats || false,
        dangerousAndCriminalContent: r.categories?.dangerous_and_criminal_content || false,
        selfharm: r.categories?.selfharm || false,
        health: r.categories?.health || false,
        financial: r.categories?.financial || false,
        law: r.categories?.law || false,
        pii: r.categories?.pii || false
      },
      categoryScores: {
        sexual: r.category_scores?.sexual || 0,
        hateAndDiscrimination: r.category_scores?.hate_and_discrimination || 0,
        violenceAndThreats: r.category_scores?.violence_and_threats || 0,
        dangerousAndCriminalContent: r.category_scores?.dangerous_and_criminal_content || 0,
        selfharm: r.category_scores?.selfharm || 0,
        health: r.category_scores?.health || 0,
        financial: r.category_scores?.financial || 0,
        law: r.category_scores?.law || 0,
        pii: r.category_scores?.pii || 0
      }
    });

    let results = (result.results || []).map(mapResult);

    let flaggedCategories = results.flatMap((r: any) =>
      Object.entries(r.categories)
        .filter(([_, v]) => v === true)
        .map(([k]) => k)
    );

    let flaggedMsg =
      flaggedCategories.length > 0
        ? `Flagged categories: **${flaggedCategories.join(', ')}**`
        : 'No harmful content detected.';

    return {
      output: {
        moderationId: result.id,
        model: result.model,
        results
      },
      message: `Moderated ${results.length} input(s) using **${result.model}**. ${flaggedMsg}`
    };
  })
  .build();
