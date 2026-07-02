import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInsightsTool = SlateTool.create(spec, {
  name: 'Get Insights',
  key: 'get_insights',
  description: `Retrieve automatically generated insights about the user's data. Insights are events found within the user's tracked data, such as "Yesterday was your highest steps value in 30 days" or weekly/monthly summaries. Results are limited to your read scopes.`,
  instructions: [
    'Use priority to filter: 1=today, 2=this week, 3=last week, 4=last month.',
    'Use dateMin/dateMax (YYYY-MM-DD) to filter by target date range.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dateMin: z.string().optional().describe('Earliest target date to include (YYYY-MM-DD)'),
      dateMax: z.string().optional().describe('Latest target date to include (YYYY-MM-DD)'),
      priority: z
        .number()
        .optional()
        .describe('Filter by priority: 1=today, 2=this week, 3=last week, 4=last month'),
      limit: z.number().optional().describe('Number of results per page (max 100)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of insights'),
      insights: z
        .array(
          z.object({
            createdAt: z.string().describe('When the insight was generated'),
            targetDate: z.string().describe('The date the insight refers to'),
            typeName: z.string().describe('Insight type identifier'),
            period: z.number().describe('Period type (1=day, 7=week, etc.)'),
            priority: z.number().describe('Priority level'),
            attributeName: z.string().describe('Associated attribute name'),
            attributeLabel: z.string().describe('Associated attribute label'),
            groupName: z.string().describe('Attribute group name'),
            text: z.string().describe('Plain text description of the insight'),
            html: z.string().describe('HTML formatted description')
          })
        )
        .describe('List of insights'),
      hasMore: z.boolean().describe('Whether there are more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.getInsights({
      dateMin: ctx.input.dateMin,
      dateMax: ctx.input.dateMax,
      priority: ctx.input.priority,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let insights = result.results.map(i => ({
      createdAt: i.created,
      targetDate: i.target_date,
      typeName: i.type.name,
      period: i.type.period,
      priority: i.type.priority,
      attributeName: i.type.attribute.name,
      attributeLabel: i.type.attribute.label,
      groupName: i.type.attribute.group.name,
      text: i.text,
      html: i.html
    }));

    return {
      output: {
        totalCount: result.count,
        insights,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** insight(s). Returned ${insights.length} on this page.`
    };
  })
  .build();
