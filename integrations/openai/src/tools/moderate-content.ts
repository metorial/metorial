import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let categoryScoresSchema = z.object({
  hate: z.number().describe('Score for hate content'),
  hateThreatening: z.number().describe('Score for hate/threatening content'),
  harassment: z.number().describe('Score for harassment content'),
  harassmentThreatening: z.number().describe('Score for harassment/threatening content'),
  selfHarm: z.number().describe('Score for self-harm content'),
  selfHarmIntent: z.number().describe('Score for self-harm intent'),
  selfHarmInstructions: z.number().describe('Score for self-harm instructions'),
  sexual: z.number().describe('Score for sexual content'),
  sexualMinors: z.number().describe('Score for sexual/minors content'),
  violence: z.number().describe('Score for violence content'),
  violenceGraphic: z.number().describe('Score for violence/graphic content')
});

let categoryFlagsSchema = z.object({
  hate: z.boolean(),
  hateThreatening: z.boolean(),
  harassment: z.boolean(),
  harassmentThreatening: z.boolean(),
  selfHarm: z.boolean(),
  selfHarmIntent: z.boolean(),
  selfHarmInstructions: z.boolean(),
  sexual: z.boolean(),
  sexualMinors: z.boolean(),
  violence: z.boolean(),
  violenceGraphic: z.boolean()
});

export let moderateContent = SlateTool.create(spec, {
  name: 'Moderate Content',
  key: 'moderate_content',
  description: `Classify text against OpenAI's content policy categories. Returns flagged status and per-category scores for hate, harassment, self-harm, sexual, and violence content. Useful for filtering harmful content in user-generated input.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      input: z
        .union([z.string(), z.array(z.string())])
        .describe('Text or array of texts to moderate'),
      model: z
        .string()
        .optional()
        .describe('Moderation model to use (e.g. "omni-moderation-latest")')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            flagged: z
              .boolean()
              .describe('Whether the content was flagged as violating any policy'),
            categories: categoryFlagsSchema.describe('Whether each category was flagged'),
            categoryScores: categoryScoresSchema.describe(
              'Confidence scores for each category (0-1)'
            )
          })
        )
        .describe('Moderation results for each input'),
      model: z.string().describe('Model used for moderation')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createModeration({
      input: ctx.input.input,
      model: ctx.input.model
    });

    let results = (result.results ?? []).map((r: any) => ({
      flagged: r.flagged,
      categories: {
        hate: r.categories?.hate ?? false,
        hateThreatening: r.categories?.['hate/threatening'] ?? false,
        harassment: r.categories?.harassment ?? false,
        harassmentThreatening: r.categories?.['harassment/threatening'] ?? false,
        selfHarm: r.categories?.['self-harm'] ?? false,
        selfHarmIntent: r.categories?.['self-harm/intent'] ?? false,
        selfHarmInstructions: r.categories?.['self-harm/instructions'] ?? false,
        sexual: r.categories?.sexual ?? false,
        sexualMinors: r.categories?.['sexual/minors'] ?? false,
        violence: r.categories?.violence ?? false,
        violenceGraphic: r.categories?.['violence/graphic'] ?? false
      },
      categoryScores: {
        hate: r.category_scores?.hate ?? 0,
        hateThreatening: r.category_scores?.['hate/threatening'] ?? 0,
        harassment: r.category_scores?.harassment ?? 0,
        harassmentThreatening: r.category_scores?.['harassment/threatening'] ?? 0,
        selfHarm: r.category_scores?.['self-harm'] ?? 0,
        selfHarmIntent: r.category_scores?.['self-harm/intent'] ?? 0,
        selfHarmInstructions: r.category_scores?.['self-harm/instructions'] ?? 0,
        sexual: r.category_scores?.sexual ?? 0,
        sexualMinors: r.category_scores?.['sexual/minors'] ?? 0,
        violence: r.category_scores?.violence ?? 0,
        violenceGraphic: r.category_scores?.['violence/graphic'] ?? 0
      }
    }));

    let flaggedCount = results.filter((r: any) => r.flagged).length;

    return {
      output: {
        results,
        model: result.model
      },
      message: `Moderated **${results.length}** input(s). **${flaggedCount}** flagged.`
    };
  })
  .build();
