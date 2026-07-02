import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchSecurityItems = SlateTool.create(spec, {
  name: 'Search Security Items',
  key: 'search_security_items',
  description: `Search and filter security findings (SRM items) across your organization. Includes SAST issues, secrets detection, dependency vulnerabilities, IaC scanning, DAST findings, and more. Filter by priority, status, scan type, repository, and category.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      repositories: z.array(z.string()).optional().describe('Filter by repository names.'),
      priorities: z
        .array(z.enum(['Critical', 'High', 'Medium', 'Low']))
        .optional()
        .describe('Filter by priority levels.'),
      statuses: z
        .array(
          z.enum(['Overdue', 'OnTrack', 'DueSoon', 'ClosedOnTime', 'ClosedLate', 'Ignored'])
        )
        .optional()
        .describe('Filter by item statuses.'),
      scanTypes: z
        .array(
          z.enum([
            'SAST',
            'SCA',
            'ContainerSCA',
            'Secrets',
            'IaC',
            'CICD',
            'License',
            'PenTesting',
            'DAST',
            'CSPM'
          ])
        )
        .optional()
        .describe('Filter by scan types.'),
      categories: z
        .array(z.string())
        .optional()
        .describe('Filter by security categories (e.g. Cryptography).'),
      searchText: z.string().optional().describe('Free text search within security items.'),
      dastTargetUrls: z.array(z.string()).optional().describe('Filter by DAST target URLs.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of items to return (1-100).')
    })
  )
  .output(
    z.object({
      securityItems: z
        .array(
          z.object({
            srmItemId: z.string().describe('Unique SRM item identifier.'),
            title: z.string().optional().describe('Security item title.'),
            priority: z
              .string()
              .optional()
              .describe('Priority level (Critical, High, Medium, Low).'),
            status: z.string().optional().describe('Current status.'),
            scanType: z.string().optional().describe('Type of scan that found the issue.'),
            repository: z.string().optional().describe('Repository name.'),
            securityCategory: z.string().optional().describe('Security category.'),
            openedAt: z.string().optional().describe('Date when the item was opened.'),
            dueAt: z.string().optional().describe('Due date for remediation.'),
            cvssScore: z.number().optional().describe('CVSS score.'),
            cwe: z.string().optional().describe('CWE identifier.'),
            cve: z.string().optional().describe('CVE identifier.'),
            htmlUrl: z.string().optional().describe('URL to view the item in Codacy.')
          })
        )
        .describe('List of security items.'),
      cursor: z.string().optional().describe('Pagination cursor for the next page.'),
      total: z.number().optional().describe('Total number of matching items.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: any = {};
    if (ctx.input.repositories) body.repositories = ctx.input.repositories;
    if (ctx.input.priorities) body.priorities = ctx.input.priorities;
    if (ctx.input.statuses) body.statuses = ctx.input.statuses;
    if (ctx.input.scanTypes) body.scanTypes = ctx.input.scanTypes;
    if (ctx.input.categories) body.categories = ctx.input.categories;
    if (ctx.input.searchText) body.searchText = ctx.input.searchText;
    if (ctx.input.dastTargetUrls) body.dastTargetUrls = ctx.input.dastTargetUrls;

    let response = await client.searchSecurityItems(body, {
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let securityItems = (response.data ?? []).map((item: any) => ({
      srmItemId: item.id ?? '',
      title: item.title ?? undefined,
      priority: item.priority ?? undefined,
      status: item.status ?? undefined,
      scanType: item.scanType ?? undefined,
      repository: item.repository ?? undefined,
      securityCategory: item.securityCategory ?? undefined,
      openedAt: item.openedAt ?? undefined,
      dueAt: item.dueAt ?? undefined,
      cvssScore: item.cvssScore ?? undefined,
      cwe: item.cwe ?? undefined,
      cve: item.cve ?? undefined,
      htmlUrl: item.htmlUrl ?? undefined
    }));

    return {
      output: {
        securityItems,
        cursor: response.pagination?.cursor,
        total: response.pagination?.total
      },
      message: `Found **${securityItems.length}** security item(s).${response.pagination?.total ? ` Total: ${response.pagination.total}.` : ''}`
    };
  })
  .build();
