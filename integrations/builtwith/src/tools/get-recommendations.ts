import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recommendationSchema = z
  .object({
    name: z.string().optional().describe('Recommended technology name'),
    description: z.string().optional().describe('Technology description'),
    link: z.string().optional().describe('Technology website'),
    score: z.number().optional().describe('Recommendation confidence score')
  })
  .passthrough();

export let getRecommendations = SlateTool.create(spec, {
  name: 'Get Technology Recommendations',
  key: 'get_recommendations',
  description: `Get technology recommendations for a website based on what other sites with similar technology profiles use. Useful for identifying complementary tools and technologies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain to get recommendations for (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      recommendations: z.array(recommendationSchema).describe('Recommended technologies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.recommendations(ctx.input.domain);

    let recommendations = data?.Results ?? [];

    return {
      output: {
        recommendations
      },
      message: `Found **${recommendations.length}** technology recommendation(s) for **${ctx.input.domain}**.`
    };
  });
