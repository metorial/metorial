import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let managePipeline = SlateTool.create(spec, {
  name: 'Manage Pipeline',
  key: 'manage_pipeline',
  description: `Create, start, stop, or delete Delta Live Tables pipelines. Pipelines define declarative data transformations as directed acyclic graphs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'start', 'stop', 'delete']).describe('Action to perform'),
      pipelineId: z
        .string()
        .optional()
        .describe('Pipeline ID (required for start/stop/delete)'),
      name: z.string().optional().describe('Pipeline name (required for create)'),
      libraries: z
        .array(
          z.object({
            notebook: z
              .object({
                path: z.string().describe('Workspace path to the notebook')
              })
              .optional()
              .describe('Notebook library')
          })
        )
        .optional()
        .describe('Pipeline libraries (required for create)'),
      target: z.string().optional().describe('Target schema for the pipeline output'),
      catalog: z.string().optional().describe('Unity Catalog catalog name'),
      continuous: z.boolean().optional().describe('Run in continuous mode'),
      configuration: z
        .record(z.string(), z.string())
        .optional()
        .describe('Pipeline configuration key-value pairs'),
      fullRefresh: z
        .boolean()
        .optional()
        .describe('Full refresh when starting (recompute all tables)')
    })
  )
  .output(
    z.object({
      pipelineId: z.string().describe('Pipeline ID'),
      updateId: z.string().optional().describe('Update ID (when starting a pipeline)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let { action, pipelineId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.libraries)
        throw new Error('name and libraries are required for create');
      let result = await client.createPipeline({
        name: ctx.input.name,
        libraries: ctx.input.libraries,
        target: ctx.input.target,
        catalog: ctx.input.catalog,
        continuous: ctx.input.continuous,
        configuration: ctx.input.configuration as Record<string, string> | undefined
      });
      return {
        output: { pipelineId: result.pipeline_id },
        message: `Created pipeline **${ctx.input.name}** (${result.pipeline_id}).`
      };
    }

    if (!pipelineId) throw new Error('pipelineId is required for this action');

    switch (action) {
      case 'start': {
        let result = await client.startPipelineUpdate(pipelineId, ctx.input.fullRefresh);
        return {
          output: { pipelineId, updateId: result.update_id },
          message: `Started pipeline **${pipelineId}**${ctx.input.fullRefresh ? ' (full refresh)' : ''}.`
        };
      }
      case 'stop':
        await client.stopPipeline(pipelineId);
        return { output: { pipelineId }, message: `Stopped pipeline **${pipelineId}**.` };
      case 'delete':
        await client.deletePipeline(pipelineId);
        return { output: { pipelineId }, message: `Deleted pipeline **${pipelineId}**.` };
    }
  })
  .build();
