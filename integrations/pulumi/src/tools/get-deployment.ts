import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let getDeployment = SlateTool.create(spec, {
  name: 'Get Deployment',
  key: 'get_deployment',
  description: `Retrieve details and optionally logs for a specific deployment. Use this to check deployment status, view logs, or monitor deployment progress.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organization: organizationInput,
      projectName: z.string().describe('Project name'),
      stackName: z.string().describe('Stack name'),
      deploymentId: z.string().describe('Deployment ID'),
      includeLogs: z.boolean().optional().describe('If true, also fetch deployment logs')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().optional(),
      version: z.number().optional(),
      status: z.string().optional(),
      operation: z.string().optional(),
      requestedBy: z.any().optional(),
      started: z.string().optional(),
      lastUpdated: z.string().optional(),
      logs: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    let deployment = await client.getDeployment(
      org,
      ctx.input.projectName,
      ctx.input.stackName,
      ctx.input.deploymentId
    );

    let logs: Awaited<ReturnType<Client['getDeploymentLogs']>>['lines'] | undefined;
    if (ctx.input.includeLogs) {
      logs = (
        await client.getDeploymentLogs(
          org,
          ctx.input.projectName,
          ctx.input.stackName,
          ctx.input.deploymentId
        )
      ).lines;
    }

    return {
      output: {
        deploymentId: deployment.id,
        version: deployment.version,
        status: deployment.status,
        operation: deployment.pulumiOperation ?? deployment.operation,
        requestedBy: deployment.requestedBy,
        started: deployment.created,
        lastUpdated: deployment.modified,
        logs
      },
      message: `Deployment **${ctx.input.deploymentId}** on **${org}/${ctx.input.projectName}/${ctx.input.stackName}** — status: **${deployment.status || 'unknown'}**`
    };
  })
  .build();
