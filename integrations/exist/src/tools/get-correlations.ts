import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let correlationSchema = z.object({
  date: z.string().describe('Date the correlation was generated'),
  period: z.number().describe('Number of days used in the correlation analysis'),
  firstAttribute: z.string().describe('Name of the first attribute'),
  secondAttribute: z.string().describe('Name of the second attribute'),
  strength: z.number().describe('Correlation coefficient value'),
  pValue: z.number().describe('Statistical p-value'),
  percentage: z.number().describe('Correlation percentage'),
  stars: z.number().describe('Confidence rating (1-5 stars)'),
  description: z.string().nullable().describe('Human-readable description of the correlation'),
  secondPerson: z
    .string()
    .describe('Human-readable second-person description (e.g. "you walk more")'),
  strengthDescription: z.string().describe('Description of correlation strength'),
  starsDescription: z.string().describe('Description of confidence level')
});

export let getCorrelationsTool = SlateTool.create(spec, {
  name: 'Get Correlations',
  key: 'get_correlations',
  description: `Retrieve correlations between tracked attributes. Correlations describe relationships between two data points (e.g., "You have a better day when you walk more"). Generated weekly from up to a year of data. Can retrieve all correlations or look up a specific pair.`,
  instructions: [
    'To find the correlation between two specific attributes, provide both firstAttribute and secondAttribute.',
    'Use strongOnly=true to filter for stronger relationships, confidendOnly=true for five-star confidence.',
    'Filter by a single attribute to find all correlations involving that attribute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      firstAttribute: z
        .string()
        .optional()
        .describe('Filter by or look up a specific attribute name'),
      secondAttribute: z
        .string()
        .optional()
        .describe('Second attribute for a specific pair lookup (requires firstAttribute)'),
      strongOnly: z.boolean().optional().describe('Only return strong correlations'),
      confidentOnly: z
        .boolean()
        .optional()
        .describe('Only return five-star confidence correlations'),
      limit: z.number().optional().describe('Number of results per page (max 100)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      correlations: z.array(correlationSchema).describe('List of correlations'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of correlations (not present for pair lookups)'),
      hasMore: z.boolean().describe('Whether there are more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    if (ctx.input.firstAttribute && ctx.input.secondAttribute) {
      let correlation = await client.getCorrelationCombo({
        attribute: ctx.input.firstAttribute,
        attribute2: ctx.input.secondAttribute
      });

      let mapped = {
        date: correlation.date,
        period: correlation.period,
        firstAttribute: correlation.attribute,
        secondAttribute: correlation.attribute2,
        strength: correlation.value,
        pValue: correlation.p,
        percentage: correlation.percentage,
        stars: correlation.stars,
        description: correlation.description,
        secondPerson: correlation.second_person,
        strengthDescription: correlation.strength_description,
        starsDescription: correlation.stars_description
      };

      return {
        output: {
          correlations: [mapped],
          hasMore: false
        },
        message: `Found correlation between **${correlation.attribute}** and **${correlation.attribute2}**: ${correlation.second_person} (${correlation.stars} stars).`
      };
    }

    let result = await client.getCorrelations({
      attribute: ctx.input.firstAttribute,
      limit: ctx.input.limit,
      page: ctx.input.page,
      strong: ctx.input.strongOnly,
      confident: ctx.input.confidentOnly
    });

    let correlations = result.results.map(c => ({
      date: c.date,
      period: c.period,
      firstAttribute: c.attribute,
      secondAttribute: c.attribute2,
      strength: c.value,
      pValue: c.p,
      percentage: c.percentage,
      stars: c.stars,
      description: c.description,
      secondPerson: c.second_person,
      strengthDescription: c.strength_description,
      starsDescription: c.stars_description
    }));

    return {
      output: {
        correlations,
        totalCount: result.count,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** correlation(s). Returned ${correlations.length} on this page.`
    };
  })
  .build();
