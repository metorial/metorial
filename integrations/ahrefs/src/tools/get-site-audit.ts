import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSiteAudit = SlateTool.create(spec, {
  name: 'Get Site Audit',
  key: 'get_site_audit',
  description: `Retrieve Site Audit data including project list, health scores, detected issues, and crawled page details.
Use to access technical SEO audit results and identify on-site issues that need attention.`,
  instructions: [
    'Use "reportType" of "projects" to list all Site Audit projects.',
    'Use "health-score" to get the project Health Score.',
    'Use "issues" to get detected SEO issues.',
    'Use "page-explorer" to browse crawled pages and their details.'
  ],
  constraints: [
    'Consumes API units for issues and page-explorer requests (minimum 50 per request).',
    'Rate limited to 60 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['projects', 'health-score', 'issues', 'page-explorer'])
        .describe('Type of Site Audit report to retrieve'),
      projectId: z
        .string()
        .optional()
        .describe('Site Audit project ID (required for all reports except "projects")'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      where: z.string().optional().describe('Filter expression in Ahrefs filter syntax'),
      orderBy: z.string().optional().describe('Sort order'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      auditData: z.any().describe('Site audit data for the specified report')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    switch (ctx.input.reportType) {
      case 'projects':
        result = await client.getSiteAuditProjects();
        break;
      case 'health-score':
        if (!ctx.input.projectId)
          throw new Error('projectId is required for health-score report');
        result = await client.getSiteAuditHealthScore({ project_id: ctx.input.projectId });
        break;
      case 'issues':
        if (!ctx.input.projectId) throw new Error('projectId is required for issues report');
        result = await client.getSiteAuditIssues({
          project_id: ctx.input.projectId,
          select: ctx.input.select,
          where: ctx.input.where,
          order_by: ctx.input.orderBy,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        break;
      case 'page-explorer':
        if (!ctx.input.projectId)
          throw new Error('projectId is required for page-explorer report');
        result = await client.getSiteAuditPageExplorer({
          project_id: ctx.input.projectId,
          select: ctx.input.select,
          where: ctx.input.where,
          order_by: ctx.input.orderBy,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        break;
    }

    return {
      output: {
        auditData: result
      },
      message: `Retrieved site audit ${ctx.input.reportType} report${ctx.input.projectId ? ` for project **${ctx.input.projectId}**` : ''}.`
    };
  })
  .build();
