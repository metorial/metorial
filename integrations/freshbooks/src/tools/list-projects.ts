import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in FreshBooks. Returns project details including title, client, type, and duration. Requires a **businessId** in the configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.number(),
          title: z.string().nullable().optional(),
          clientId: z.number().nullable().optional(),
          projectType: z.string().nullable().optional(),
          fixedPrice: z.string().nullable().optional(),
          rate: z.string().nullable().optional(),
          complete: z.boolean().nullable().optional(),
          active: z.boolean().nullable().optional(),
          loggedDuration: z.number().nullable().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let params: Record<string, string | number> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;

    let result = await client.listProjects(params);

    let projects = (result.projects || []).map((p: any) => ({
      projectId: p.id,
      title: p.title,
      clientId: p.client_id,
      projectType: p.project_type,
      fixedPrice: p.fixed_price,
      rate: p.rate,
      complete: p.complete,
      active: p.active,
      loggedDuration: p.logged_duration
    }));

    return {
      output: {
        projects,
        totalCount: result.meta?.total || projects.length,
        currentPage: result.meta?.page || 1,
        totalPages: result.meta?.pages || 1
      },
      message: `Found **${result.meta?.total || projects.length}** projects.`
    };
  })
  .build();
