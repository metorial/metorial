import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let getPipeline = SlateTool.create(spec, {
  name: 'Get Pipeline',
  key: 'get_pipeline',
  description: `Get detailed information about a specific pipeline, including its repository, compute environment, launch configuration, and labels.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pipelineId: z.number().describe('The numeric ID of the pipeline')
    })
  )
  .output(
    z.object({
      pipelineId: z.number().optional().describe('Pipeline ID'),
      name: z.string().optional().describe('Pipeline name'),
      description: z.string().optional().describe('Pipeline description'),
      repository: z.string().optional().describe('Pipeline repository URL'),
      computeEnvId: z.string().optional().describe('Compute environment ID'),
      workDir: z.string().optional().describe('Work directory'),
      revision: z.string().optional().describe('Pipeline revision/branch'),
      configProfiles: z.array(z.string()).optional().describe('Nextflow config profiles'),
      paramsText: z.string().optional().describe('Pipeline parameters text'),
      configText: z.string().optional().describe('Nextflow configuration text'),
      preRunScript: z.string().optional().describe('Pre-run script'),
      postRunScript: z.string().optional().describe('Post-run script'),
      labels: z
        .array(
          z.object({
            labelId: z.number().optional(),
            name: z.string().optional(),
            value: z.string().optional()
          })
        )
        .optional()
        .describe('Resource labels'),
      lastUpdated: z.string().optional().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    let pipeline = await client.describePipeline(ctx.input.pipelineId);

    return {
      output: {
        pipelineId: pipeline.pipelineId,
        name: pipeline.name,
        description: pipeline.description,
        repository: pipeline.repository,
        computeEnvId: pipeline.computeEnvId,
        workDir: pipeline.workDir,
        revision: pipeline.revision,
        configProfiles: pipeline.configProfiles,
        paramsText: pipeline.paramsText,
        configText: pipeline.configText,
        preRunScript: pipeline.preRunScript,
        postRunScript: pipeline.postRunScript,
        labels: pipeline.labels?.map(l => ({
          labelId: l.id,
          name: l.name,
          value: l.value
        })),
        lastUpdated: pipeline.lastUpdated
      },
      message: `Pipeline **${pipeline.name || ctx.input.pipelineId}** retrieved successfully.`
    };
  })
  .build();
