import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushV4Client } from '../lib/v4-client';
import { spec } from '../spec';

export let manageSiteAudit = SlateTool.create(spec, {
  name: 'Manage Site Audit',
  key: 'manage_site_audit',
  description: `Enable, run, and retrieve site audit results for Semrush projects. Site audits identify technical SEO issues like broken links, missing meta tags, duplicate content, and crawlability problems.
Requires OAuth 2.0 authentication.`,
  instructions: [
    'First create a project using the Manage Project tool, then use the projectId here.',
    'Typical workflow: "enable" the audit, "run" it, then "get_snapshot" and "get_issues" once complete.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['enable', 'run', 'get_snapshot', 'get_issues'])
        .describe('Action to perform'),
      projectId: z.string().describe('Semrush project ID'),
      snapshotId: z.string().optional().describe('Specific snapshot ID (defaults to latest)'),
      crawlLimit: z.number().optional().describe('Maximum pages to crawl (for enable action)'),
      crawlSubdomains: z
        .boolean()
        .optional()
        .describe('Whether to crawl subdomains (for enable action)'),
      severity: z
        .string()
        .optional()
        .describe('Filter issues by severity: errors, warnings, notices'),
      limit: z.number().optional().describe('Maximum number of issues to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      auditEnabled: z
        .boolean()
        .optional()
        .describe('Whether the audit was successfully enabled'),
      auditStarted: z.boolean().optional().describe('Whether the audit run was started'),
      snapshot: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Audit snapshot summary'),
      issues: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of SEO issues found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushV4Client({
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'enable': {
        await client.enableSiteAudit(ctx.input.projectId, {
          crawlLimit: ctx.input.crawlLimit,
          crawlSubdomains: ctx.input.crawlSubdomains
        });
        return {
          output: { auditEnabled: true },
          message: `Site audit enabled for project **${ctx.input.projectId}**.`
        };
      }

      case 'run': {
        await client.runSiteAudit(ctx.input.projectId);
        return {
          output: { auditStarted: true },
          message: `Site audit started for project **${ctx.input.projectId}**. Check back later for results.`
        };
      }

      case 'get_snapshot': {
        let snapshot = await client.getSiteAuditSnapshot(
          ctx.input.projectId,
          ctx.input.snapshotId
        );
        return {
          output: { snapshot },
          message: `Retrieved site audit snapshot for project **${ctx.input.projectId}**.`
        };
      }

      case 'get_issues': {
        let issues = await client.getSiteAuditIssues(ctx.input.projectId, {
          snapshotId: ctx.input.snapshotId,
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          severity: ctx.input.severity
        });
        return {
          output: { issues },
          message: `Found ${issues.length} issues in site audit for project **${ctx.input.projectId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
