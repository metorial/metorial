import { SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

export let getDeploymentLogsTool = SlateTool.create(spec, {
  name: 'Get Deployment Logs',
  key: 'get_deployment_logs',
  description: `Retrieve logs and errors for a specific deployment. Useful for debugging and monitoring deployed applications. Optionally filter logs by timestamp.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('The deployment ID to get logs for'),
      since: z
        .string()
        .optional()
        .describe('ISO timestamp to filter logs from (only return logs after this time)'),
      includeErrors: z.boolean().optional().describe('Also fetch deployment errors')
    })
  )
  .output(
    z.object({
      logs: z.any().describe('Deployment log entries'),
      errors: z.any().optional().describe('Deployment errors (if includeErrors was true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);

    let logs = await client.getDeploymentLogs(ctx.input.deploymentId, ctx.input.since);

    let errors: any;
    if (ctx.input.includeErrors) {
      errors = await client.getDeploymentErrors(ctx.input.deploymentId);
    }

    return {
      output: {
        logs,
        errors
      },
      message: `Retrieved logs for deployment ${ctx.input.deploymentId}.${errors ? ' Errors included.' : ''}`
    };
  })
  .build();
