import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTrends = SlateTool.create(spec, {
  name: 'Get Trends',
  key: 'get_trends',
  description: `Discover trending topics and product categories on Pinterest for a specific region. Useful for content strategy, understanding popular interests, and identifying trending products.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      region: z
        .enum([
          'US',
          'CA',
          'DE',
          'FR',
          'ES',
          'IT',
          'DE+AT+CH',
          'GB+IE',
          'IT+ES+PT+GR+MT',
          'PL+RO+HU+SK+CZ',
          'SE+DK+FI+NO',
          'NL+BE+LU',
          'AR',
          'BR',
          'CO',
          'MX',
          'MX+AR+CO+CL',
          'AU+NZ'
        ])
        .describe('Region/country code for trends'),
      trendType: z
        .enum(['growing', 'monthly', 'yearly', 'seasonal'])
        .describe('Type of trending data to retrieve'),
      interests: z.array(z.string()).optional().describe('Filter by interest categories'),
      genders: z
        .array(z.enum(['female', 'male', 'unisex']))
        .optional()
        .describe('Filter by gender demographic'),
      ages: z
        .array(z.enum(['18-24', '25-34', '35-44', '45-49', '50-54', '55-64', '65+']))
        .optional()
        .describe('Filter by age demographic'),
      includeKeywords: z
        .array(z.string())
        .optional()
        .describe('Only include trends containing at least one of these keywords'),
      normalizeAgainstGroup: z
        .boolean()
        .optional()
        .describe('Normalize trend scores against the selected audience group'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of trending topics to return (default 50)')
    })
  )
  .output(
    z.object({
      trends: z.array(z.any()).describe('List of trending topics with their metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTrendingTopics({
      region: ctx.input.region,
      trendType: ctx.input.trendType,
      interests: ctx.input.interests,
      genders: ctx.input.genders,
      ages: ctx.input.ages,
      includeKeywords: ctx.input.includeKeywords,
      normalizeAgainstGroup: ctx.input.normalizeAgainstGroup,
      limit: ctx.input.limit
    });

    let trends = result.trends || result.items || [];

    return {
      output: {
        trends
      },
      message: `Found **${trends.length}** trending topics in **${ctx.input.region}** (${ctx.input.trendType}).`
    };
  })
  .build();
