import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let createPipeline = SlateTool.create(spec, {
  name: 'Create Pipeline',
  key: 'create_pipeline',
  description: `Create a new pre-configured pipeline in the workspace. A pipeline bundles a workflow repository with a compute environment and launch parameters for easy repeated execution.`,
  instructions: [
    'The **repository** must be a valid Nextflow pipeline repository URL (e.g., "https://github.com/nextflow-io/hello").',
    'If no **computeEnvId** is provided, the workspace primary compute environment is used.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the pipeline'),
      description: z.string().optional().describe('Pipeline description'),
      repository: z.string().describe('Nextflow pipeline repository URL'),
      computeEnvId: z.string().optional().describe('Compute environment ID to use'),
      workDir: z.string().optional().describe('Work directory path (e.g., s3://bucket/work)'),
      revision: z.string().optional().describe('Pipeline revision, branch, or tag'),
      configProfiles: z.array(z.string()).optional().describe('Nextflow config profiles'),
      paramsText: z.string().optional().describe('Pipeline parameters as JSON or YAML'),
      configText: z.string().optional().describe('Custom Nextflow configuration'),
      preRunScript: z.string().optional().describe('Script to run before pipeline launch'),
      postRunScript: z.string().optional().describe('Script to run after pipeline completes'),
      labelIds: z.array(z.number()).optional().describe('Label IDs to attach to the pipeline')
    })
  )
  .output(
    z.object({
      pipelineId: z.number().optional().describe('Created pipeline ID'),
      name: z.string().optional().describe('Pipeline name'),
      repository: z.string().optional().describe('Pipeline repository URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    let pipeline = await client.createPipeline({
      name: ctx.input.name,
      description: ctx.input.description,
      repository: ctx.input.repository,
      computeEnvId: ctx.input.computeEnvId,
      workDir: ctx.input.workDir,
      revision: ctx.input.revision,
      configProfiles: ctx.input.configProfiles,
      paramsText: ctx.input.paramsText,
      configText: ctx.input.configText,
      preRunScript: ctx.input.preRunScript,
      postRunScript: ctx.input.postRunScript,
      labelIds: ctx.input.labelIds
    });

    return {
      output: {
        pipelineId: pipeline.pipelineId,
        name: pipeline.name,
        repository: pipeline.repository
      },
      message: `Pipeline **${pipeline.name || ctx.input.name}** created successfully.`
    };
  })
  .build();
