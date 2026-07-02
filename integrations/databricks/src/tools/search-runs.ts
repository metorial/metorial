import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let searchRuns = SlateTool.create(spec, {
  name: 'Search MLflow Runs',
  key: 'search_runs',
  description: `Search for MLflow runs across one or more experiments. Filter by metrics, parameters, and tags using the MLflow search syntax. Returns run metadata, metrics, and parameters.`,
  instructions: [
    'Filter syntax examples: `metrics.rmse < 0.5`, `params.learning_rate = "0.01"`, `tags.env = "prod"`.',
    'Order by examples: `metrics.rmse ASC`, `start_time DESC`.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      experimentIds: z.array(z.string()).describe('Experiment IDs to search within'),
      filter: z.string().optional().describe('MLflow filter expression'),
      maxResults: z.number().optional().describe('Maximum number of runs to return'),
      orderBy: z
        .array(z.string())
        .optional()
        .describe('Order by clauses (e.g., "metrics.rmse ASC")'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      runs: z
        .array(
          z.object({
            runId: z.string().describe('Run ID'),
            experimentId: z.string().describe('Experiment ID'),
            runName: z.string().optional().describe('Run name'),
            status: z
              .string()
              .optional()
              .describe('Run status (RUNNING, SCHEDULED, FINISHED, FAILED, KILLED)'),
            startTime: z.string().optional().describe('Start time in epoch ms'),
            endTime: z.string().optional().describe('End time in epoch ms'),
            metrics: z
              .record(z.string(), z.number())
              .optional()
              .describe('Latest metric values'),
            params: z.record(z.string(), z.string()).optional().describe('Run parameters'),
            tags: z.record(z.string(), z.string()).optional().describe('Run tags'),
            artifactUri: z.string().optional().describe('Artifact URI')
          })
        )
        .describe('Matching MLflow runs'),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let result = await client.listRuns(ctx.input.experimentIds, {
      filter: ctx.input.filter,
      maxResults: ctx.input.maxResults,
      orderBy: ctx.input.orderBy,
      pageToken: ctx.input.pageToken
    });

    let runs = (result.runs ?? []).map((r: any) => {
      let metrics: Record<string, number> = {};
      for (let m of r.data?.metrics ?? []) {
        metrics[m.key] = m.value;
      }
      let params: Record<string, string> = {};
      for (let p of r.data?.params ?? []) {
        params[p.key] = p.value;
      }
      let tags: Record<string, string> = {};
      for (let t of r.data?.tags ?? []) {
        tags[t.key] = t.value;
      }

      return {
        runId: r.info?.run_id ?? '',
        experimentId: r.info?.experiment_id ?? '',
        runName: r.info?.run_name,
        status: r.info?.status,
        startTime: r.info?.start_time ? String(r.info.start_time) : undefined,
        endTime: r.info?.end_time ? String(r.info.end_time) : undefined,
        metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
        params: Object.keys(params).length > 0 ? params : undefined,
        tags: Object.keys(tags).length > 0 ? tags : undefined,
        artifactUri: r.info?.artifact_uri
      };
    });

    return {
      output: {
        runs,
        nextPageToken: result.next_page_token
      },
      message: `Found **${runs.length}** run(s).`
    };
  })
  .build();
