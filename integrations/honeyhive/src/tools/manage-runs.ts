import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const projectIdSchema = z
  .string()
  .optional()
  .describe(
    'Legacy project selector retained for compatibility. The connection API key determines the project; this value does not change its scope.'
  );
const aggregateFunctionSchema = z
  .enum(['average', 'min', 'max', 'median', 'p95', 'p99', 'p90', 'sum', 'count'])
  .optional()
  .describe('Metric aggregation function');

export let listRuns = SlateTool.create(spec, {
  name: 'List Experiment Runs',
  key: 'list_runs',
  description: `List evaluation/experiment runs in a project. Supports filtering by dataset, name, status, and pagination. Use this to find and compare past experiment results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe(
          'Legacy project selector retained for compatibility. The connection API key determines the project; this value does not change its scope.'
        ),
      datasetId: z.string().optional().describe('Filter by dataset ID'),
      runIds: z.array(z.string()).optional().describe('Filter by specific run IDs'),
      name: z.string().optional().describe('Filter by run name'),
      status: z.enum(['pending', 'completed']).optional().describe('Filter by status'),
      page: z.number().int().min(1).optional().default(1).describe('Page number'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(7500)
        .optional()
        .default(20)
        .describe('Results per page'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Sort field: created_at, updated_at, name, status, or run_id (run_id sorting loads the complete filtered run collection)'
        ),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      runs: z
        .array(
          z.object({
            runId: z.string().describe('Run ID'),
            name: z.string().optional().describe('Run name'),
            status: z.string().optional().describe('Run status'),
            datasetId: z.string().optional().describe('Associated dataset ID'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of experiment runs'),
      totalRuns: z.number().optional().describe('Total number of runs'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;

    let data = await client.listRuns({
      project,
      dataset_id: ctx.input.datasetId,
      run_ids: ctx.input.runIds,
      name: ctx.input.name,
      status: ctx.input.status,
      page: ctx.input.page,
      limit: ctx.input.limit,
      sort_by: ctx.input.sortBy,
      sort_order: ctx.input.sortOrder
    });

    let records: Record<string, any>[] = data.evaluations || [];
    let runs = records.map(r => ({
      runId: r.run_id || r.id,
      name: r.name ?? undefined,
      status: r.status ?? undefined,
      datasetId: r.dataset_id ?? undefined,
      createdAt: r.created_at
    }));
    let totalRuns = data.pagination?.total;

    return {
      output: {
        runs,
        totalRuns,
        totalPages: data.pagination?.total_pages
      },
      message: `Found **${runs.length}** run(s) (total: ${totalRuns}).`
    };
  })
  .build();

export let createRun = SlateTool.create(spec, {
  name: 'Create Experiment Run',
  key: 'create_run',
  description: `Create a new evaluation/experiment run. Runs associate traced events with a dataset and configuration for evaluation and comparison.`
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe(
          'Legacy project selector retained for compatibility. The connection API key determines the project; this value does not change its scope.'
        ),
      name: z.string().describe('Name for the experiment run'),
      eventIds: z.array(z.string()).describe('Event IDs to include in the run'),
      datasetId: z.string().optional().describe('Dataset ID for this run'),
      datapointIds: z.array(z.string()).optional().describe('Specific datapoint IDs'),
      configuration: z
        .record(z.string(), z.any())
        .optional()
        .describe('Configuration used for this run'),
      metadata: z.record(z.string(), z.any()).optional().describe('Additional metadata'),
      status: z.enum(['pending', 'completed']).optional().describe('Run status')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('ID of the created run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let project = ctx.input.project || ctx.config.project;

    let data = await client.createRun({
      project,
      name: ctx.input.name,
      event_ids: ctx.input.eventIds,
      dataset_id: ctx.input.datasetId,
      datapoint_ids: ctx.input.datapointIds,
      configuration: ctx.input.configuration,
      metadata: ctx.input.metadata,
      status: ctx.input.status
    });

    return {
      output: { runId: data.run_id },
      message: `Created experiment run **${ctx.input.name}** with ID \`${data.run_id}\`.`
    };
  })
  .build();

export let getRun = SlateTool.create(spec, {
  name: 'Get Experiment Run',
  key: 'get_run',
  description: `Retrieve full details and results of an experiment run by its ID. Includes event IDs, dataset association, configuration, and metric results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      runId: z.string().describe('ID of the run to retrieve')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Run ID'),
      name: z.string().optional().describe('Run name'),
      status: z.string().optional().describe('Run status'),
      project: z.string().optional().describe('Project name'),
      projectId: z.string().optional().describe('Project ID returned by the provider'),
      datasetId: z.string().optional().describe('Associated dataset ID'),
      eventIds: z.array(z.string()).optional().describe('Event IDs in this run'),
      datapointIds: z.array(z.string()).optional().describe('Datapoint IDs'),
      results: z
        .record(z.string(), z.any())
        .optional()
        .describe('Evaluation results and metric outcomes'),
      configuration: z.record(z.string(), z.any()).optional().describe('Configuration used'),
      metadata: z.record(z.string(), z.any()).optional().describe('Run metadata'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let response = await client.getRun(ctx.input.runId);
    let data = response.evaluation || response;
    if (data?.run_id !== ctx.input.runId)
      throw createApiServiceError('HoneyHive did not return the requested run.', {
        reason: 'honeyhive_invalid_response'
      });

    return {
      output: {
        runId: data.run_id || ctx.input.runId,
        name: data.name ?? undefined,
        status: data.status ?? undefined,
        project: data.project,
        projectId: data.scope_type === 'project' ? data.scope_id : undefined,
        datasetId: data.dataset_id ?? undefined,
        eventIds: data.event_ids,
        datapointIds: data.datapoint_ids,
        results: data.results,
        configuration: data.configuration,
        metadata: data.metadata,
        createdAt: data.created_at
      },
      message: `Retrieved run **${data.name || ctx.input.runId}** (status: ${data.status || 'unknown'}).`
    };
  })
  .build();

export let getRunResult = SlateTool.create(spec, {
  name: 'Get Run Results',
  key: 'get_run_result',
  description: `Retrieve detailed evaluation results for an experiment run, including pass/fail outcomes, metric aggregations, and per-datapoint details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      runId: z.string().describe('ID of the run'),
      projectId: projectIdSchema,
      aggregateFunction: aggregateFunctionSchema
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Run status'),
      success: z.boolean().optional().describe('Whether the run passed'),
      passed: z.array(z.any()).optional().describe('Passed evaluations'),
      failed: z.array(z.any()).optional().describe('Failed evaluations'),
      metrics: z.record(z.string(), z.any()).optional().describe('Metric results'),
      datapoints: z.array(z.any()).optional().describe('Per-datapoint details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let data = await client.getRunResult(ctx.input.runId, {
      aggregate_function: ctx.input.aggregateFunction
    });

    return {
      output: {
        status: data.status ?? undefined,
        success: data.success,
        passed: data.passed,
        failed: data.failed,
        metrics: data.metrics,
        datapoints: data.datapoints
      },
      message: `Retrieved results for run \`${ctx.input.runId}\`: ${data.success ? '**passed**' : '**failed**'}.`
    };
  })
  .build();

export let compareRuns = SlateTool.create(spec, {
  name: 'Compare Experiment Runs',
  key: 'compare_runs',
  description: `Compare two experiment runs side by side. Shows metric differences, common datapoints, and per-event comparison details. Useful for detecting regressions or improvements between runs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      newRunId: z.string().describe('ID of the newer run'),
      oldRunId: z.string().describe('ID of the older (baseline) run'),
      projectId: projectIdSchema,
      aggregateFunction: aggregateFunctionSchema
    })
  )
  .output(
    z.object({
      metrics: z.array(z.any()).optional().describe('Metric comparisons between the two runs'),
      commonDatapoints: z
        .array(z.string())
        .optional()
        .describe('Datapoint IDs shared between runs'),
      eventComparisons: z.array(z.any()).optional().describe('Per-event comparison details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    let data = await client.compareRuns(ctx.input.newRunId, ctx.input.oldRunId, {
      aggregate_function: ctx.input.aggregateFunction
    });

    return {
      output: {
        metrics: data.metrics,
        commonDatapoints: data.commonDatapoints,
        eventComparisons: data.event_details
      },
      message: `Compared run \`${ctx.input.newRunId}\` against baseline \`${ctx.input.oldRunId}\`.`
    };
  })
  .build();

export let deleteRun = SlateTool.create(spec, {
  name: 'Delete Experiment Run',
  key: 'delete_run',
  description: `Delete an experiment run by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      runId: z.string().describe('ID of the run to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    await client.deleteRun(ctx.input.runId);

    return {
      output: { success: true },
      message: `Deleted run \`${ctx.input.runId}\`.`
    };
  })
  .build();

export let updateRun = SlateTool.create(spec, {
  name: 'Update Experiment Run',
  key: 'update_run',
  description:
    'Update an experiment run name, status, configuration, metadata, or associated events and datapoints.'
})
  .input(
    z.object({
      runId: z.string().describe('Run ID. Call list_runs to discover runs.'),
      name: z.string().optional().describe('Updated run name'),
      status: z.enum(['pending', 'completed']).optional().describe('Updated run status'),
      eventIds: z
        .array(z.string())
        .optional()
        .describe('Additional event IDs to associate with the run'),
      datasetId: z
        .string()
        .optional()
        .describe(
          'Legacy update field unavailable on the current API; set datasetId when creating a run.'
        ),
      datapointIds: z
        .array(z.string())
        .optional()
        .describe('Additional datapoint IDs to associate with the run'),
      configuration: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated configuration'),
      metadata: z.record(z.string(), z.unknown()).optional().describe('Updated run metadata')
    })
  )
  .output(z.object({ success: z.boolean(), runId: z.string() }))
  .handleInvocation(async ctx => {
    if (
      Object.entries(ctx.input).every(([key, value]) => key === 'runId' || value === undefined)
    ) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    let client = new Client({ token: ctx.auth.token, serverUrl: ctx.config.serverUrl });
    await client.updateRun(ctx.input.runId, {
      name: ctx.input.name,
      status: ctx.input.status,
      event_ids: ctx.input.eventIds,
      dataset_id: ctx.input.datasetId,
      datapoint_ids: ctx.input.datapointIds,
      configuration: ctx.input.configuration,
      metadata: ctx.input.metadata
    });
    return {
      output: { success: true, runId: ctx.input.runId },
      message: `Updated experiment run ${ctx.input.runId}.`
    };
  })
  .build();
