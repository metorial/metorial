import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let outputSchema = z.object({
  deploymentId: z.string().describe('Deployment ID'),
  serviceStats: z
    .record(z.string(), z.any())
    .optional()
    .nullable()
    .describe('Service statistics (request count, latency, etc.)'),
  accuracy: z
    .record(z.string(), z.any())
    .optional()
    .nullable()
    .describe('Model accuracy metrics'),
  dataDrift: z.any().optional().nullable().describe('Feature drift data'),
  targetDrift: z.any().optional().nullable().describe('Target drift data')
});

export let getDeploymentMonitoring = SlateTool.create(spec, {
  name: 'Get Deployment Monitoring',
  key: 'get_deployment_monitoring',
  description: `Retrieve monitoring data for a deployed model including service health statistics, accuracy metrics, data drift, and target drift. Choose which monitoring aspects to include.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment to monitor'),
      includeServiceStats: z
        .boolean()
        .optional()
        .describe('Include service health statistics (request counts, latency, etc.)'),
      includeAccuracy: z.boolean().optional().describe('Include accuracy metrics'),
      includeDataDrift: z.boolean().optional().describe('Include feature drift data'),
      includeTargetDrift: z.boolean().optional().describe('Include target drift data'),
      startTime: z
        .string()
        .optional()
        .describe(
          'Start time for monitoring window (ISO 8601, top-of-hour, e.g. 2024-01-01T00:00:00Z)'
        ),
      endTime: z
        .string()
        .optional()
        .describe('End time for monitoring window (ISO 8601, top-of-hour)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    let timeParams = {
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime
    };

    let serviceStats: any = null;
    let accuracy: any = null;
    let dataDrift: any = null;
    let targetDrift: any = null;

    let includeAll =
      !ctx.input.includeServiceStats &&
      !ctx.input.includeAccuracy &&
      !ctx.input.includeDataDrift &&
      !ctx.input.includeTargetDrift;

    if (includeAll || ctx.input.includeServiceStats) {
      serviceStats = await client.getServiceStats(ctx.input.deploymentId, timeParams);
    }

    if (includeAll || ctx.input.includeAccuracy) {
      accuracy = await client.getAccuracy(ctx.input.deploymentId, timeParams);
    }

    if (includeAll || ctx.input.includeDataDrift) {
      dataDrift = await client.getDataDrift(ctx.input.deploymentId, timeParams);
    }

    if (includeAll || ctx.input.includeTargetDrift) {
      targetDrift = await client.getTargetDrift(ctx.input.deploymentId, timeParams);
    }

    let sections: string[] = [];
    if (serviceStats) sections.push('service stats');
    if (accuracy) sections.push('accuracy');
    if (dataDrift) sections.push('data drift');
    if (targetDrift) sections.push('target drift');

    return {
      output: parseOutput(outputSchema, {
        deploymentId: ctx.input.deploymentId,
        serviceStats,
        accuracy,
        dataDrift,
        targetDrift
      }),
      message: `Monitoring data retrieved for deployment **${ctx.input.deploymentId}**: ${sections.length > 0 ? sections.join(', ') : 'no data available'}.`
    };
  })
  .build();
