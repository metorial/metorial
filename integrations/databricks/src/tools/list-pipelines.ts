import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let listPipelines = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List Delta Live Tables pipelines in the workspace. Optionally filter by name or other criteria.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('Filter expression (e.g., "name LIKE \'%etl%\'")'),
      maxResults: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineId: z.string().describe('Pipeline ID'),
            name: z.string().describe('Pipeline name'),
            state: z.string().optional().describe('Pipeline state (IDLE, RUNNING, etc.)'),
            creatorUserName: z.string().optional().describe('Creator username'),
            latestUpdateStatus: z.string().optional().describe('Status of the latest update')
          })
        )
        .describe('Delta Live Tables pipelines')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let result = await client.listPipelines({
      filter: ctx.input.filter,
      maxResults: ctx.input.maxResults
    });

    let pipelines = (result.statuses ?? []).map((p: any) => ({
      pipelineId: p.pipeline_id ?? '',
      name: p.name ?? '',
      state: p.state,
      creatorUserName: p.creator_user_name,
      latestUpdateStatus: p.latest_updates?.[0]?.state
    }));

    return {
      output: { pipelines },
      message: `Found **${pipelines.length}** pipeline(s).`
    };
  })
  .build();
