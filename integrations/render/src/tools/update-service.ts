import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let updateService = SlateTool.create(spec, {
  name: 'Update Service',
  key: 'update_service',
  description: `Update the configuration of an existing Render service. Supports changing name, build/start commands, auto-deploy, branch, plan, health check path, and more.`,
  instructions: [
    'Only include the fields you want to change. Unspecified fields remain unchanged.'
  ]
})
  .input(
    z.object({
      serviceId: z.string().describe('The service ID (e.g., srv-abc123)'),
      name: z.string().optional().describe('New service name'),
      autoDeploy: z
        .enum(['yes', 'no'])
        .optional()
        .describe('Enable or disable auto-deploy on push'),
      branch: z.string().optional().describe('Git branch to deploy from'),
      buildCommand: z.string().optional().describe('Build command'),
      startCommand: z.string().optional().describe('Start command'),
      plan: z.string().optional().describe('Instance plan (e.g., starter, standard, pro)'),
      healthCheckPath: z
        .string()
        .optional()
        .describe('Health check endpoint path (web services)'),
      numInstances: z.number().optional().describe('Number of instances (manual scaling)'),
      schedule: z.string().optional().describe('Cron schedule expression (cron jobs only)')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('The updated service ID'),
      name: z.string().describe('Service name after update'),
      type: z.string().describe('Service type'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.autoDeploy !== undefined) body.autoDeploy = ctx.input.autoDeploy;
    if (ctx.input.branch !== undefined) body.branch = ctx.input.branch;
    if (ctx.input.buildCommand !== undefined) body.buildCommand = ctx.input.buildCommand;
    if (ctx.input.startCommand !== undefined) body.startCommand = ctx.input.startCommand;
    if (ctx.input.plan !== undefined) body.plan = ctx.input.plan;
    if (ctx.input.healthCheckPath !== undefined)
      body.healthCheckPath = ctx.input.healthCheckPath;
    if (ctx.input.numInstances !== undefined) body.numInstances = ctx.input.numInstances;
    if (ctx.input.schedule !== undefined) body.schedule = ctx.input.schedule;

    let s = await client.updateService(ctx.input.serviceId, body);

    return {
      output: {
        serviceId: s.id,
        name: s.name,
        type: s.type,
        updatedAt: s.updatedAt
      },
      message: `Updated service **${s.name}** (\`${s.id}\`).`
    };
  })
  .build();
