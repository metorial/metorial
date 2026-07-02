import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnalyticsDataClient } from '../lib/client';
import {
  propertyIdInstructions,
  propertyIdSchema,
  resolvePropertyId
} from '../lib/properties';
import { googleAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

let funnelFilterExpressionSchema: z.ZodType<any> = z
  .object({
    funnelFieldFilter: z
      .object({
        fieldName: z.string().describe('Dimension or metric name to filter on.'),
        stringFilter: z
          .object({
            matchType: z
              .enum([
                'EXACT',
                'BEGINS_WITH',
                'ENDS_WITH',
                'CONTAINS',
                'FULL_REGEXP',
                'PARTIAL_REGEXP'
              ])
              .optional(),
            value: z.string(),
            caseSensitive: z.boolean().optional()
          })
          .optional(),
        inListFilter: z
          .object({
            values: z.array(z.string()),
            caseSensitive: z.boolean().optional()
          })
          .optional()
      })
      .optional(),
    funnelEventFilter: z
      .object({
        eventName: z
          .string()
          .optional()
          .describe('Event name to match (e.g., "page_view", "purchase").')
      })
      .optional(),
    andGroup: z
      .object({
        expressions: z.array(z.lazy(() => funnelFilterExpressionSchema))
      })
      .optional(),
    orGroup: z
      .object({
        expressions: z.array(z.lazy(() => funnelFilterExpressionSchema))
      })
      .optional(),
    notExpression: z.lazy(() => funnelFilterExpressionSchema).optional()
  })
  .describe('Funnel filter expression.');

export let runFunnelReport = SlateTool.create(spec, {
  name: 'Run Funnel Report',
  key: 'run_funnel_report',
  description: `Generate a funnel report to visualize the steps users take to complete a task. Shows how well users succeed or fail at each step in a multi-step process.

Use this to analyze conversion funnels like checkout flows, onboarding sequences, or any multi-step user journey.`,
  instructions: [
    ...propertyIdInstructions,
    'Each step in the funnel should have a descriptive name and a filter expression that defines which users qualify for that step.',
    'Steps are evaluated in order — a user must complete step N before being counted in step N+1 (unless isOpenFunnel is true).'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleAnalyticsActionScopes.runFunnelReport)
  .input(
    z.object({
      propertyId: propertyIdSchema,
      dateRanges: z
        .array(
          z.object({
            startDate: z.string().describe('Start date in YYYY-MM-DD format.'),
            endDate: z.string().describe('End date in YYYY-MM-DD format.')
          })
        )
        .optional()
        .describe('Optional date ranges. Defaults to last 30 days if not specified.'),
      steps: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Descriptive name for this funnel step (e.g., "Viewed Product", "Added to Cart").'
              ),
            filterExpression: funnelFilterExpressionSchema
              .optional()
              .describe('Filter expression defining which users qualify for this step.'),
            isDirectlyFollowedBy: z
              .boolean()
              .optional()
              .describe(
                'If true, this step must directly follow the previous step without intervening events.'
              ),
            withinDurationFromPriorStep: z
              .string()
              .optional()
              .describe('Maximum time from the prior step (e.g., "3600s" for 1 hour).')
          })
        )
        .min(2)
        .describe('Funnel steps in order. At least 2 steps required.'),
      isOpenFunnel: z
        .boolean()
        .optional()
        .describe(
          'If true, users can enter the funnel at any step (open funnel). Default is closed funnel.'
        ),
      breakdownDimension: z
        .string()
        .optional()
        .describe(
          'Optional dimension to break down funnel results by (e.g., "deviceCategory", "country").'
        )
    })
  )
  .output(
    z.object({
      funnelTable: z
        .any()
        .optional()
        .describe('Funnel table with step-by-step conversion data.'),
      funnelVisualization: z.any().optional().describe('Funnel visualization data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnalyticsDataClient({
      token: ctx.auth.token
    });
    const propertyId = resolvePropertyId(ctx.input, ctx.config);

    let requestBody: any = {
      funnel: {
        steps: ctx.input.steps.map(step => ({
          name: step.name,
          filterExpression: step.filterExpression,
          isDirectlyFollowedBy: step.isDirectlyFollowedBy,
          withinDurationFromPriorStep: step.withinDurationFromPriorStep
        })),
        isOpenFunnel: ctx.input.isOpenFunnel
      }
    };

    if (ctx.input.dateRanges) {
      requestBody.dateRanges = ctx.input.dateRanges;
    }

    if (ctx.input.breakdownDimension) {
      requestBody.funnelBreakdown = {
        breakdownDimension: { name: ctx.input.breakdownDimension }
      };
    }

    let result = await client.runFunnelReport(propertyId, requestBody);

    return {
      output: {
        funnelTable: result.funnelTable,
        funnelVisualization: result.funnelVisualization
      },
      message: `Funnel report generated with **${ctx.input.steps.length}** steps${ctx.input.breakdownDimension ? `, broken down by **${ctx.input.breakdownDimension}**` : ''}.`
    };
  })
  .build();
