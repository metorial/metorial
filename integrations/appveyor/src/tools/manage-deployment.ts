import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let manageDeployment = SlateTool.create(spec, {
  name: 'Manage Deployment',
  key: 'manage_deployment',
  description: `Start a new deployment, get deployment details, cancel a running deployment, or view deployment history for a project or environment.`,
  instructions: [
    'For **start**: provide environmentName, accountName, projectSlug, and buildVersion.',
    'For **get**: provide deploymentId.',
    'For **cancel**: provide deploymentId.',
    'For **projectHistory**: provide accountName and projectSlug.',
    'For **environmentHistory**: provide environmentId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['start', 'get', 'cancel', 'projectHistory', 'environmentHistory'])
        .describe('Operation to perform'),
      deploymentId: z.number().optional().describe('Deployment ID (required for get, cancel)'),
      environmentName: z
        .string()
        .optional()
        .describe('Target environment name (required for start)'),
      accountName: z
        .string()
        .optional()
        .describe('Account name (required for start, projectHistory)'),
      projectSlug: z
        .string()
        .optional()
        .describe('Project slug (required for start, projectHistory)'),
      buildVersion: z
        .string()
        .optional()
        .describe('Build version to deploy (required for start)'),
      buildJobId: z.string().optional().describe('Specific build job ID to deploy'),
      environmentVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom environment variables for the deployment'),
      environmentId: z
        .number()
        .optional()
        .describe('Environment ID (required for environmentHistory)')
    })
  )
  .output(
    z.object({
      deployment: z.record(z.string(), z.unknown()).optional().describe('Deployment details'),
      deployments: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Deployment history'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    switch (ctx.input.action) {
      case 'start': {
        if (
          !ctx.input.environmentName ||
          !ctx.input.accountName ||
          !ctx.input.projectSlug ||
          !ctx.input.buildVersion
        ) {
          throw new Error(
            'environmentName, accountName, projectSlug, and buildVersion are required for start'
          );
        }
        let deployment = await client.startDeployment({
          environmentName: ctx.input.environmentName,
          accountName: ctx.input.accountName,
          projectSlug: ctx.input.projectSlug,
          buildVersion: ctx.input.buildVersion,
          buildJobId: ctx.input.buildJobId,
          environmentVariables: ctx.input.environmentVariables
        });
        return {
          output: { deployment, success: true },
          message: `Started deployment of build **${ctx.input.buildVersion}** to **${ctx.input.environmentName}**.`
        };
      }

      case 'get': {
        if (ctx.input.deploymentId === undefined) {
          throw new Error('deploymentId is required for get');
        }
        let deployment = await client.getDeployment(ctx.input.deploymentId);
        return {
          output: { deployment, success: true },
          message: `Retrieved deployment **${ctx.input.deploymentId}**.`
        };
      }

      case 'cancel': {
        if (ctx.input.deploymentId === undefined) {
          throw new Error('deploymentId is required for cancel');
        }
        await client.cancelDeployment(ctx.input.deploymentId);
        return {
          output: { success: true },
          message: `Cancelled deployment **${ctx.input.deploymentId}**.`
        };
      }

      case 'projectHistory': {
        if (!ctx.input.accountName || !ctx.input.projectSlug) {
          throw new Error('accountName and projectSlug are required for projectHistory');
        }
        let result = await client.getProjectDeployments(
          ctx.input.accountName,
          ctx.input.projectSlug
        );
        let deployments = (result as any).deployments || [];
        return {
          output: { deployments, success: true },
          message: `Found **${deployments.length}** deployment(s) for **${ctx.input.accountName}/${ctx.input.projectSlug}**.`
        };
      }

      case 'environmentHistory': {
        if (ctx.input.environmentId === undefined) {
          throw new Error('environmentId is required for environmentHistory');
        }
        let result = await client.getEnvironmentDeployments(ctx.input.environmentId);
        let deployments = (result as any).deployments || [];
        return {
          output: { deployments, success: true },
          message: `Found **${deployments.length}** deployment(s) for environment **${ctx.input.environmentId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
