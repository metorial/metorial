import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listResources = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description: `Lists various Northflank resources at the team or project level. Supports listing jobs, addons, pipelines, domains, templates, log sinks, tags, and invoices.`,
  instructions: [
    'Set resourceType to the kind of resource to list.',
    'For project-scoped resources (jobs, addons, pipelines), a projectId is required.',
    'For team-scoped resources (domains, templates, log_sinks, tags, invoices), projectId is not needed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum([
          'jobs',
          'addons',
          'pipelines',
          'domains',
          'templates',
          'log_sinks',
          'tags',
          'invoices'
        ])
        .describe('Type of resource to list'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID (required for jobs, addons, pipelines)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      resources: z.array(z.record(z.string(), z.any())).describe('List of resources'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      cursor: z.string().optional().describe('Cursor for the next page'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { resourceType, projectId } = ctx.input;
    let paginationParams = {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      cursor: ctx.input.cursor
    };

    let resources: Record<string, any>[] = [];
    let pagination: any;
    let label: string = resourceType;

    if (resourceType === 'jobs') {
      if (!projectId) throw new Error('projectId is required for listing jobs');
      let result = await client.listJobs(projectId, paginationParams);
      pagination = result.pagination;
      resources = (result.data?.jobs || []).map((j: any) => ({
        jobId: j.id,
        name: j.name,
        jobType: j.jobType,
        tags: j.tags
      }));
    } else if (resourceType === 'addons') {
      if (!projectId) throw new Error('projectId is required for listing addons');
      let result = await client.listAddons(projectId, paginationParams);
      pagination = result.pagination;
      resources = (result.data?.addons || []).map((a: any) => ({
        addonId: a.id,
        name: a.name,
        status: a.status,
        tags: a.tags
      }));
    } else if (resourceType === 'pipelines') {
      if (!projectId) throw new Error('projectId is required for listing pipelines');
      let result = await client.listPipelines(projectId, paginationParams);
      pagination = result.pagination;
      resources = (result.data?.pipelines || []).map((p: any) => ({
        pipelineId: p.id,
        name: p.name,
        description: p.description
      }));
    } else if (resourceType === 'domains') {
      let result = await client.listDomains(paginationParams);
      pagination = result.pagination;
      resources = (result.data?.domains || []).map((d: any) => ({
        domainName: d.name,
        status: d.status
      }));
    } else if (resourceType === 'templates') {
      let result = await client.listTemplates(paginationParams);
      pagination = result.pagination;
      resources = (result.data?.templates || []).map((t: any) => ({
        templateId: t.id,
        name: t.name,
        description: t.description
      }));
    } else if (resourceType === 'log_sinks') {
      let result = await client.listLogSinks(paginationParams);
      pagination = result.pagination;
      resources = (result.data?.logSinks || []).map((l: any) => ({
        logSinkId: l.id,
        name: l.name,
        status: l.status
      }));
      label = 'log sink';
    } else if (resourceType === 'tags') {
      let result = await client.listTags(paginationParams);
      pagination = result.pagination;
      resources = (result.data?.tags || []).map((t: any) => ({
        tagId: t.id,
        name: t.name,
        color: t.color
      }));
    } else if (resourceType === 'invoices') {
      let result = await client.listInvoices(paginationParams);
      pagination = result.pagination;
      resources = (result.data?.invoices || []).map((i: any) => ({
        invoiceId: i.id,
        amount: i.amount,
        status: i.status,
        createdAt: i.createdAt
      }));
    } else {
      throw new Error(`Unknown resource type: ${resourceType}`);
    }

    return {
      output: {
        resources,
        hasNextPage: pagination?.hasNextPage ?? false,
        cursor: pagination?.cursor,
        count: pagination?.count ?? resources.length
      },
      message: `Found **${resources.length}** ${label}(s).`
    };
  })
  .build();
