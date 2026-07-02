import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let listExperiments = SlateTool.create(spec, {
  name: 'List MLflow Experiments',
  key: 'list_experiments',
  description: `List MLflow experiments in the workspace. Experiments are containers for organizing ML runs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      maxResults: z.number().optional().describe('Maximum number of experiments to return'),
      pageToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      experiments: z
        .array(
          z.object({
            experimentId: z.string().describe('Experiment ID'),
            name: z.string().describe('Experiment name'),
            artifactLocation: z.string().optional().describe('Artifact storage location'),
            lifecycleStage: z
              .string()
              .optional()
              .describe('Lifecycle stage (active or deleted)'),
            lastUpdateTime: z.string().optional().describe('Last update time in epoch ms'),
            creationTime: z.string().optional().describe('Creation time in epoch ms')
          })
        )
        .describe('MLflow experiments'),
      nextPageToken: z.string().optional().describe('Token for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let result = await client.listExperiments({
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken
    });

    let experiments = (result.experiments ?? []).map((e: any) => ({
      experimentId: e.experiment_id ?? '',
      name: e.name ?? '',
      artifactLocation: e.artifact_location,
      lifecycleStage: e.lifecycle_stage,
      lastUpdateTime: e.last_update_time ? String(e.last_update_time) : undefined,
      creationTime: e.creation_time ? String(e.creation_time) : undefined
    }));

    return {
      output: {
        experiments,
        nextPageToken: result.next_page_token
      },
      message: `Found **${experiments.length}** experiment(s).`
    };
  })
  .build();
