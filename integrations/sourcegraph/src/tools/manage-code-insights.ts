import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let insightViewSchema = z.object({
  insightViewId: z.string().describe('GraphQL ID of the insight view'),
  title: z.string().describe('Title of the insight'),
  description: z.string().optional(),
  includeRepoRegex: z.string().optional(),
  excludeRepoRegex: z.string().optional(),
  dataSeries: z
    .array(
      z.object({
        label: z.string(),
        points: z
          .array(
            z.object({
              dateTime: z.string(),
              value: z.number()
            })
          )
          .optional(),
        status: z
          .object({
            totalPoints: z.number().optional(),
            pendingJobs: z.number().optional(),
            completedJobs: z.number().optional(),
            failedJobs: z.number().optional()
          })
          .optional()
      })
    )
    .optional()
});

export let listCodeInsights = SlateTool.create(spec, {
  name: 'List Code Insights',
  key: 'list_code_insights',
  description: `List Code Insight views on the Sourcegraph instance. Code Insights track code patterns over time with line charts and data series.
Returns insight metadata, data series with their time-series points, and processing status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      first: z.number().optional().describe('Number of insights to return (default 50)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      insights: z.array(insightViewSchema),
      totalCount: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    let data = await client.listInsightViews({
      first: ctx.input.first,
      after: ctx.input.after
    });

    let views = data.insightViews;
    let insights = (views.nodes || []).map((n: any) => ({
      insightViewId: n.id,
      title: n.title,
      description: n.description || undefined,
      includeRepoRegex: n.defaultFilters?.includeRepoRegex || undefined,
      excludeRepoRegex: n.defaultFilters?.excludeRepoRegex || undefined,
      dataSeries: (n.dataSeries || []).map((ds: any) => ({
        label: ds.label,
        points: ds.points?.map((p: any) => ({
          dateTime: p.dateTime,
          value: p.value
        })),
        status: ds.status || undefined
      }))
    }));

    return {
      output: {
        insights,
        totalCount: views.totalCount || 0,
        hasNextPage: views.pageInfo?.hasNextPage || false,
        endCursor: views.pageInfo?.endCursor || undefined
      },
      message: `Found **${views.totalCount}** code insights. Showing ${insights.length}.`
    };
  })
  .build();

export let createCodeInsight = SlateTool.create(spec, {
  name: 'Create Code Insight',
  key: 'create_code_insight',
  description: `Create a new line chart search insight that tracks code patterns over time.
Define one or more data series, each with a search query and label. Optionally scope to specific repositories and set a time interval.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title for the insight'),
      dataSeries: z
        .array(
          z.object({
            query: z.string().describe('Sourcegraph search query for this data series'),
            label: z.string().describe('Label for this data series'),
            repositories: z
              .array(z.string())
              .optional()
              .describe('Scope to specific repository names. Omit for all repositories.'),
            stepInterval: z
              .enum(['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'])
              .optional()
              .describe('Time interval between data points'),
            stepValue: z
              .number()
              .optional()
              .describe(
                'Number of intervals between data points (e.g., 1 with MONTH = monthly)'
              ),
            lineColor: z.string().optional().describe('Hex color for the line (e.g., #ff0000)')
          })
        )
        .describe('Data series to track'),
      dashboardIds: z
        .array(z.string())
        .optional()
        .describe('Dashboard IDs to add this insight to')
    })
  )
  .output(
    z.object({
      insightViewId: z.string(),
      title: z.string(),
      dataSeries: z.array(
        z.object({
          label: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    let input: any = {
      title: ctx.input.title,
      dataSeries: ctx.input.dataSeries.map(ds => {
        let series: any = {
          query: ds.query,
          label: ds.label
        };
        if (ds.repositories) {
          series.repositoryScope = { repositories: ds.repositories };
        }
        if (ds.stepInterval && ds.stepValue) {
          series.timeScope = {
            stepInterval: ds.stepInterval,
            stepValue: ds.stepValue
          };
        }
        if (ds.lineColor) {
          series.lineColor = ds.lineColor;
        }
        return series;
      })
    };

    if (ctx.input.dashboardIds) {
      input.dashboards = ctx.input.dashboardIds;
    }

    let data = await client.createLineChartInsight(input);
    let view = data.createLineChartSearchInsight.view;

    return {
      output: {
        insightViewId: view.id,
        title: view.title,
        dataSeries: (view.dataSeries || []).map((ds: any) => ({
          label: ds.label
        }))
      },
      message: `Created code insight **${view.title}** with ${ctx.input.dataSeries.length} data series.`
    };
  })
  .build();

export let deleteCodeInsight = SlateTool.create(spec, {
  name: 'Delete Code Insight',
  key: 'delete_code_insight',
  description: `Delete a Code Insight view from the Sourcegraph instance.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      insightViewId: z.string().describe('GraphQL ID of the insight view to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    await client.deleteInsightView(ctx.input.insightViewId);

    return {
      output: { deleted: true },
      message: `Deleted code insight **${ctx.input.insightViewId}**.`
    };
  })
  .build();
