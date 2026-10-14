import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let managePipeline = SlateTool.create(spec, {
  name: 'Manage Pipeline',
  key: 'manage_pipeline',
  description:
    'Update a saved pipeline configuration or delete a pipeline. Use list_workspaces to discover workspace IDs, then list_pipelines to find pipeline IDs.',
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      action: z.enum(['update', 'delete']),
      pipelineId: z.number().int().positive().describe('Pipeline ID from list_pipelines'),
      name: z.string().optional(),
      description: z.string().optional(),
      repository: z.string().optional().describe('Nextflow pipeline repository URL'),
      computeEnvId: z.string().optional(),
      workDir: z.string().optional(),
      revision: z.string().optional(),
      configProfiles: z.array(z.string()).optional(),
      paramsText: z.string().optional().describe('Pipeline parameters as JSON or YAML'),
      configText: z.string().optional(),
      preRunScript: z.string().optional(),
      postRunScript: z.string().optional(),
      icon: z.string().optional(),
      labelIds: z
        .array(z.number().int())
        .optional()
        .describe(
          'Replacement label IDs. Omit to preserve current labels; an empty array removes all labels.'
        )
    })
  )
  .output(
    z.object({
      pipelineId: z.number(),
      updated: z.boolean().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      workspaceId: ctx.input.workspaceId ?? ctx.config.workspaceId
    });
    if (ctx.input.action === 'delete') {
      await client.deletePipeline(ctx.input.pipelineId);
      return {
        output: { pipelineId: ctx.input.pipelineId, deleted: true },
        message: `Pipeline **${ctx.input.pipelineId}** deleted.`
      };
    }
    let { action: _action, pipelineId, workspaceId: _workspaceId, ...updates } = ctx.input;
    if (!Object.values(updates).some(value => value !== undefined)) {
      throw createApiServiceError('Provide at least one field to update the pipeline.');
    }
    await client.updatePipeline(pipelineId, updates);
    return {
      output: { pipelineId, updated: true },
      message: `Pipeline **${pipelineId}** updated.`
    };
  })
  .build();
