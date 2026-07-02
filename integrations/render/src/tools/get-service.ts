import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let getService = SlateTool.create(spec, {
  name: 'Get Service',
  key: 'get_service',
  description: `Retrieve detailed information about a specific Render service including its configuration, deployment settings, environment, plan, region, and current status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('The service ID (e.g., srv-abc123)')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('Unique service identifier'),
      name: z.string().describe('Service name'),
      type: z.string().describe('Service type'),
      repo: z.string().optional().describe('Git repository URL'),
      branch: z.string().optional().describe('Git branch'),
      autoDeploy: z.string().optional().describe('Auto-deploy setting'),
      suspended: z.string().optional().describe('Suspension status'),
      suspenders: z.array(z.string()).optional().describe('Reasons for suspension'),
      ownerId: z.string().optional().describe('Workspace/owner ID'),
      slug: z.string().optional().describe('URL-friendly identifier'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      url: z.string().optional().describe('Service URL'),
      plan: z.string().optional().describe('Instance plan type'),
      region: z.string().optional().describe('Deployment region'),
      env: z.string().optional().describe('Runtime environment'),
      buildCommand: z.string().optional().describe('Build command'),
      startCommand: z.string().optional().describe('Start command'),
      healthCheckPath: z.string().optional().describe('Health check path (web services)'),
      numInstances: z.number().optional().describe('Number of running instances'),
      schedule: z.string().optional().describe('Cron schedule (cron jobs only)'),
      notifyOnFail: z.string().optional().describe('Failure notification preference')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let s = await client.getService(ctx.input.serviceId);

    return {
      output: {
        serviceId: s.id,
        name: s.name,
        type: s.type,
        repo: s.repo,
        branch: s.branch,
        autoDeploy: s.autoDeploy,
        suspended: s.suspended,
        suspenders: s.suspenders,
        ownerId: s.ownerId,
        slug: s.slug,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        url: s.url,
        plan: s.plan,
        region: s.region,
        env: s.env,
        buildCommand: s.buildCommand,
        startCommand: s.startCommand,
        healthCheckPath: s.healthCheckPath,
        numInstances: s.numInstances,
        schedule: s.schedule,
        notifyOnFail: s.notifyOnFail
      },
      message: `Service **${s.name}** (${s.type})\n- Status: ${s.suspended === 'suspended' ? 'Suspended' : 'Active'}\n- Plan: ${s.plan || 'N/A'}\n- Region: ${s.region || 'N/A'}${s.url ? `\n- URL: ${s.url}` : ''}`
    };
  })
  .build();
