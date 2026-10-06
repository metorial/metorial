import { SlateTool } from 'slates';
import { z } from 'zod';
import { rejectHumanloopOperation } from '../lib/retirement';
import { spec } from '../spec';

export let deployPrompt = SlateTool.create(spec, {
  name: 'Deploy Prompt',
  key: 'deploy_prompt',
  description:
    'DEPRECATED — Humanloop shut down on September 8, 2025. This operation is unavailable; the tool is retained only for compatibility.',
  instructions: [
    'Humanloop is retired. Do not use this tool for new workflows; use data exported before September 8, 2025 with your chosen replacement platform.'
  ],
  tags: {
    destructive: false,
    readOnly: false,
    deprecated: true
  }
})
  .input(
    z.object({
      action: z.enum(['deploy', 'undeploy', 'list_versions']).describe('Action to perform'),
      promptId: z.string().describe('Prompt ID'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID (required for deploy/undeploy)'),
      versionId: z.string().optional().describe('Version ID to deploy (required for deploy)')
    })
  )
  .output(
    z.object({
      deployment: z.any().optional().describe('Deployment details'),
      versions: z.array(z.any()).optional().describe('List of prompt versions')
    })
  )
  .handleInvocation(async () => rejectHumanloopOperation())
  .build();
