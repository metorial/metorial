import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deployPrompt = SlateTool.create(spec, {
  name: 'Deploy Prompt',
  key: 'deploy_prompt',
  description: `Deploy or undeploy a prompt version to a specific environment. Environments control which prompt version is served via the API (e.g. staging, production). Also supports listing prompt versions and viewing current environment deployments.`,
  instructions: [
    'Use "deploy" to deploy a specific version to an environment.',
    'Use "undeploy" to remove a deployment from an environment.',
    'Use "list_versions" to see available versions for a prompt.'
  ],
  tags: {
    destructive: false,
    readOnly: false
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list_versions') {
      let result = await client.listPromptVersions(ctx.input.promptId);
      let versions = result.records || result;
      return {
        output: { versions: Array.isArray(versions) ? versions : [versions] },
        message: `Found **${Array.isArray(versions) ? versions.length : 1}** version(s) for prompt **${ctx.input.promptId}**.`
      };
    }

    if (ctx.input.action === 'deploy') {
      if (!ctx.input.environmentId)
        throw new Error('environmentId is required for deploy action');
      if (!ctx.input.versionId) throw new Error('versionId is required for deploy action');
      let result = await client.deployPromptVersion(
        ctx.input.promptId,
        ctx.input.environmentId,
        ctx.input.versionId
      );
      return {
        output: { deployment: result },
        message: `Deployed version **${ctx.input.versionId}** to environment **${ctx.input.environmentId}** for prompt **${ctx.input.promptId}**.`
      };
    }

    if (ctx.input.action === 'undeploy') {
      if (!ctx.input.environmentId)
        throw new Error('environmentId is required for undeploy action');
      await client.removePromptDeployment(ctx.input.promptId, ctx.input.environmentId);
      return {
        output: {},
        message: `Removed deployment from environment **${ctx.input.environmentId}** for prompt **${ctx.input.promptId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
