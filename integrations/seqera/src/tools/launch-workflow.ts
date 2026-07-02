import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let launchWorkflow = SlateTool.create(spec, {
  name: 'Launch Workflow',
  key: 'launch_workflow',
  description: `Launch a new Nextflow workflow run. Can launch from a pipeline repository URL directly or use a pre-configured pipeline's compute environment and settings. Returns the workflow run ID for monitoring.`,
  instructions: [
    'Provide a **pipeline** repository URL (e.g., "https://github.com/nextflow-io/hello") or pipeline name.',
    'A **computeEnvId** is required unless the workspace has a primary compute environment configured.',
    'Use **paramsText** to pass pipeline parameters as a JSON or YAML string.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pipeline: z.string().describe('Pipeline repository URL or name'),
      computeEnvId: z.string().optional().describe('Compute environment ID'),
      workDir: z.string().optional().describe('Work directory (e.g., s3://bucket/work)'),
      revision: z.string().optional().describe('Pipeline revision, branch, or tag'),
      runName: z.string().optional().describe('Custom name for this run'),
      configProfiles: z
        .array(z.string())
        .optional()
        .describe('Nextflow config profiles to activate'),
      paramsText: z.string().optional().describe('Pipeline parameters as JSON or YAML string'),
      configText: z.string().optional().describe('Custom Nextflow configuration'),
      preRunScript: z
        .string()
        .optional()
        .describe('Script to execute before the pipeline runs'),
      postRunScript: z
        .string()
        .optional()
        .describe('Script to execute after the pipeline completes'),
      resume: z.boolean().optional().describe('Resume a previous run using cached results'),
      sessionId: z.string().optional().describe('Session ID of a previous run to resume'),
      stubRun: z.boolean().optional().describe('Execute a stub run for testing'),
      headJobCpus: z.number().optional().describe('Number of CPUs for the Nextflow head job'),
      headJobMemoryMb: z
        .number()
        .optional()
        .describe('Memory in MB for the Nextflow head job'),
      labelIds: z
        .array(z.number())
        .optional()
        .describe('Label IDs to attach to the workflow run')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('ID of the launched workflow run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.launchWorkflow({
      pipeline: ctx.input.pipeline,
      computeEnvId: ctx.input.computeEnvId,
      workDir: ctx.input.workDir,
      revision: ctx.input.revision,
      runName: ctx.input.runName,
      configProfiles: ctx.input.configProfiles,
      paramsText: ctx.input.paramsText,
      configText: ctx.input.configText,
      preRunScript: ctx.input.preRunScript,
      postRunScript: ctx.input.postRunScript,
      resume: ctx.input.resume,
      sessionId: ctx.input.sessionId,
      stubRun: ctx.input.stubRun,
      headJobCpus: ctx.input.headJobCpus,
      headJobMemoryMb: ctx.input.headJobMemoryMb,
      labelIds: ctx.input.labelIds
    });

    return {
      output: {
        workflowId: result.workflowId
      },
      message: `Workflow launched successfully with ID **${result.workflowId}**${ctx.input.runName ? ` (name: ${ctx.input.runName})` : ''}.`
    };
  })
  .build();
