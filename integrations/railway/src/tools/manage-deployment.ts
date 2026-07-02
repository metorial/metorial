import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDeploymentsTool = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List deployments for a service in a specific environment. Returns deployment status, URLs, and timestamps. Use this to check deployment history and current status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().optional().describe('Filter by service ID'),
      environmentId: z.string().optional().describe('Filter by environment ID'),
      projectId: z.string().optional().describe('Filter by project ID'),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of deployments to return (default: 10)')
    })
  )
  .output(
    z.object({
      deployments: z.array(
        z.object({
          deploymentId: z.string().describe('Deployment ID'),
          status: z
            .string()
            .describe('Deployment status (e.g., SUCCESS, FAILED, BUILDING, DEPLOYING)'),
          createdAt: z.string().describe('Deployment creation timestamp'),
          url: z.string().nullable().describe('Deployment URL'),
          staticUrl: z.string().nullable().describe('Static deployment URL')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let deployments = await client.listDeployments(
      {
        serviceId: ctx.input.serviceId,
        environmentId: ctx.input.environmentId,
        projectId: ctx.input.projectId
      },
      ctx.input.limit
    );

    let mapped = deployments.map((d: any) => ({
      deploymentId: d.id,
      status: d.status,
      createdAt: d.createdAt,
      url: d.url ?? null,
      staticUrl: d.staticUrl ?? null
    }));

    return {
      output: { deployments: mapped },
      message: `Found **${mapped.length}** deployment(s).`
    };
  })
  .build();

export let getDeploymentTool = SlateTool.create(spec, {
  name: 'Get Deployment',
  key: 'get_deployment',
  description: `Get detailed information about a specific deployment, including its status, URLs, metadata, and whether it can be redeployed or rolled back.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment to retrieve')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('Deployment ID'),
      status: z.string().describe('Deployment status'),
      createdAt: z.string().describe('Creation timestamp'),
      url: z.string().nullable().describe('Deployment URL'),
      staticUrl: z.string().nullable().describe('Static deployment URL'),
      canRedeploy: z.boolean().describe('Whether this deployment can be redeployed'),
      canRollback: z.boolean().describe('Whether this deployment can be rolled back to'),
      meta: z.any().nullable().describe('Deployment metadata (commit info, etc.)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let deployment = await client.getDeployment(ctx.input.deploymentId);

    return {
      output: {
        deploymentId: deployment.id,
        status: deployment.status,
        createdAt: deployment.createdAt,
        url: deployment.url ?? null,
        staticUrl: deployment.staticUrl ?? null,
        canRedeploy: deployment.canRedeploy ?? false,
        canRollback: deployment.canRollback ?? false,
        meta: deployment.meta ?? null
      },
      message: `Deployment status: **${deployment.status}**.`
    };
  })
  .build();

export let triggerDeploymentTool = SlateTool.create(spec, {
  name: 'Trigger Deployment',
  key: 'trigger_deployment',
  description: `Trigger a new deployment for a service in a specific environment. Optionally provide a commit SHA for a connected GitHub service.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service to deploy'),
      environmentId: z.string().describe('ID of the environment to deploy in'),
      commitSha: z
        .string()
        .optional()
        .describe(
          'Optional Git commit SHA to deploy for a connected repository service. Omit to deploy the current associated commit.'
        )
    })
  )
  .output(
    z.object({
      triggered: z.boolean().describe('Whether the deployment was triggered successfully'),
      deploymentId: z.string().describe('ID of the deployment Railway created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let deploymentId = await client.deployService({
      serviceId: ctx.input.serviceId,
      environmentId: ctx.input.environmentId,
      commitSha: ctx.input.commitSha
    });

    return {
      output: { triggered: true, deploymentId },
      message: `Deployment **${deploymentId}** triggered for service in the specified environment.`
    };
  })
  .build();

export let rollbackDeploymentTool = SlateTool.create(spec, {
  name: 'Rollback Deployment',
  key: 'rollback_deployment',
  description: `Roll back a service to a previous deployment. The target deployment must support rollback (check with Get Deployment). This creates a new deployment based on the specified one.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment to roll back to')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('ID of the new rollback deployment'),
      status: z.string().describe('Status of the new deployment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let result = await client.rollbackDeployment(ctx.input.deploymentId);

    return {
      output: {
        deploymentId: result.id,
        status: result.status
      },
      message: `Rollback initiated — new deployment status: **${result.status}**.`
    };
  })
  .build();

export let cancelDeploymentTool = SlateTool.create(spec, {
  name: 'Cancel Deployment',
  key: 'cancel_deployment',
  description: `Cancel an in-progress deployment. Use this to stop a build or deploy that is currently running.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment to cancel')
    })
  )
  .output(
    z.object({
      cancelled: z.boolean().describe('Whether the deployment was successfully cancelled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    await client.cancelDeployment(ctx.input.deploymentId);

    return {
      output: { cancelled: true },
      message: `Deployment cancelled successfully.`
    };
  })
  .build();

export let restartDeploymentTool = SlateTool.create(spec, {
  name: 'Restart Deployment',
  key: 'restart_deployment',
  description: `Restart a running Railway deployment without rebuilding it.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment to restart')
    })
  )
  .output(
    z.object({
      restarted: z.boolean().describe('Whether the deployment restart was requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    await client.restartDeployment(ctx.input.deploymentId);

    return {
      output: { restarted: true },
      message: `Deployment restart requested.`
    };
  })
  .build();

export let stopDeploymentTool = SlateTool.create(spec, {
  name: 'Stop Deployment',
  key: 'stop_deployment',
  description: `Stop a running Railway deployment.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment to stop')
    })
  )
  .output(
    z.object({
      stopped: z.boolean().describe('Whether the deployment was stopped')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    await client.stopDeployment(ctx.input.deploymentId);

    return {
      output: { stopped: true },
      message: `Deployment stopped successfully.`
    };
  })
  .build();

export let removeDeploymentTool = SlateTool.create(spec, {
  name: 'Remove Deployment',
  key: 'remove_deployment',
  description: `Remove a Railway deployment from deployment history.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the deployment was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    await client.removeDeployment(ctx.input.deploymentId);

    return {
      output: { removed: true },
      message: `Deployment removed successfully.`
    };
  })
  .build();

export let getDeploymentLogsTool = SlateTool.create(spec, {
  name: 'Get Deployment Logs',
  key: 'get_deployment_logs',
  description: `Retrieve build or runtime logs for a deployment. Use **logType** to specify whether to get build logs (compilation output) or deploy logs (runtime output).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment to get logs for'),
      logType: z
        .enum(['build', 'deploy'])
        .default('deploy')
        .describe('Type of logs: "build" for build output, "deploy" for runtime logs'),
      limit: z
        .number()
        .optional()
        .default(100)
        .describe('Maximum number of log lines to return')
    })
  )
  .output(
    z.object({
      logs: z.array(
        z.object({
          timestamp: z.string().nullable().describe('Log entry timestamp'),
          message: z.string().describe('Log message'),
          severity: z.string().nullable().describe('Log severity level')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let logs =
      ctx.input.logType === 'build'
        ? await client.getBuildLogs(ctx.input.deploymentId, ctx.input.limit)
        : await client.getDeploymentLogs(ctx.input.deploymentId, ctx.input.limit);

    let mapped = (logs || []).map((l: any) => ({
      timestamp: l.timestamp ?? null,
      message: l.message,
      severity: l.severity ?? null
    }));

    return {
      output: { logs: mapped },
      message: `Retrieved **${mapped.length}** ${ctx.input.logType} log line(s).`
    };
  })
  .build();

export let getHttpLogsTool = SlateTool.create(spec, {
  name: 'Get HTTP Logs',
  key: 'get_http_logs',
  description: `Retrieve HTTP request logs for a Railway deployment, including request path, status, timings, and edge metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deploymentId: z.string().describe('ID of the deployment to get HTTP logs for'),
      limit: z.number().optional().default(100).describe('Maximum number of HTTP log lines'),
      filter: z.string().optional().describe('Optional Railway log filter expression'),
      startDate: z.string().optional().describe('Optional ISO start timestamp'),
      endDate: z.string().optional().describe('Optional ISO end timestamp')
    })
  )
  .output(
    z.object({
      logs: z.array(
        z.object({
          timestamp: z.string().nullable(),
          requestId: z.string().nullable(),
          method: z.string().nullable(),
          path: z.string().nullable(),
          host: z.string().nullable(),
          httpStatus: z.number().nullable(),
          responseDetails: z.string().nullable(),
          totalDuration: z.number().nullable(),
          upstreamRqDuration: z.number().nullable(),
          rxBytes: z.number().nullable(),
          txBytes: z.number().nullable(),
          srcIp: z.string().nullable(),
          clientUa: z.string().nullable(),
          edgeRegion: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let logs = await client.getHttpLogs({
      deploymentId: ctx.input.deploymentId,
      limit: ctx.input.limit,
      filter: ctx.input.filter,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let mapped = (logs || []).map((log: any) => ({
      timestamp: log.timestamp ?? null,
      requestId: log.requestId ?? null,
      method: log.method ?? null,
      path: log.path ?? null,
      host: log.host ?? null,
      httpStatus: log.httpStatus ?? null,
      responseDetails: log.responseDetails ?? null,
      totalDuration: log.totalDuration ?? null,
      upstreamRqDuration: log.upstreamRqDuration ?? null,
      rxBytes: log.rxBytes ?? null,
      txBytes: log.txBytes ?? null,
      srcIp: log.srcIp ?? null,
      clientUa: log.clientUa ?? null,
      edgeRegion: log.edgeRegion ?? null
    }));

    return {
      output: { logs: mapped },
      message: `Retrieved **${mapped.length}** HTTP log line(s).`
    };
  })
  .build();
