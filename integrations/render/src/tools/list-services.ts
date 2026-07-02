import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

let serviceSchema = z.object({
  serviceId: z.string().describe('Unique service identifier'),
  name: z.string().describe('Service name'),
  type: z
    .string()
    .describe(
      'Service type (web_service, private_service, background_worker, static_site, cron_job)'
    ),
  repo: z.string().optional().describe('Git repository URL'),
  branch: z.string().optional().describe('Git branch for deployments'),
  autoDeploy: z.string().optional().describe('Auto-deploy setting'),
  suspended: z.string().optional().describe('Suspension status'),
  ownerId: z.string().optional().describe('Workspace/owner ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  url: z.string().optional().describe('Service URL'),
  plan: z.string().optional().describe('Instance plan type'),
  region: z.string().optional().describe('Deployment region')
});

export let listServices = SlateTool.create(spec, {
  name: 'List Services',
  key: 'list_services',
  description: `List all services in your Render account. Filter by workspace, service type, or name. Returns service metadata including type, status, repository, branch, and URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ownerId: z.string().optional().describe('Filter by workspace/owner ID'),
      serviceType: z
        .enum([
          'web_service',
          'private_service',
          'background_worker',
          'static_site',
          'cron_job'
        ])
        .optional()
        .describe('Filter by service type'),
      name: z.string().optional().describe('Filter by service name'),
      limit: z.number().optional().describe('Maximum number of results (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor from previous response')
    })
  )
  .output(
    z.object({
      services: z.array(serviceSchema),
      cursor: z.string().optional().describe('Cursor for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);

    let params: Record<string, any> = {};
    if (ctx.input.ownerId) params.ownerId = [ctx.input.ownerId];
    if (ctx.input.serviceType) params.type = [ctx.input.serviceType];
    if (ctx.input.name) params.name = [ctx.input.name];
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.cursor) params.cursor = ctx.input.cursor;

    let data = await client.listServices(params);

    let lastCursor: string | undefined;
    let services = (data as any[]).map((item: any) => {
      lastCursor = item.cursor;
      let s = item.service;
      return {
        serviceId: s.id,
        name: s.name,
        type: s.type,
        repo: s.repo,
        branch: s.branch,
        autoDeploy: s.autoDeploy,
        suspended: s.suspended,
        ownerId: s.ownerId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        url: s.url,
        plan: s.plan,
        region: s.region
      };
    });

    return {
      output: {
        services,
        cursor: lastCursor
      },
      message: `Found **${services.length}** service(s).${services.map(s => `\n- **${s.name}** (${s.type}) - ${s.suspended === 'suspended' ? 'Suspended' : 'Active'}`).join('')}`
    };
  })
  .build();
