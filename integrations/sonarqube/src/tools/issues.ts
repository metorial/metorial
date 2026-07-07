import { z } from 'zod';
import {
  branchPullRequestInputs,
  createClient,
  createSonarTool,
  readOnlyTool
} from './shared';

let issueStatusChangeSchema = z.enum(['accept', 'falsepositive', 'reopen']);
let issueSearchSeveritySchema = z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'BLOCKER']);
let issueStatusSchema = z.enum([
  'OPEN',
  'CONFIRMED',
  'FALSE_POSITIVE',
  'ACCEPTED',
  'FIXED',
  'IN_SANDBOX'
]);
let issueImpactSoftwareQualitySchema = z.enum(['MAINTAINABILITY', 'RELIABILITY', 'SECURITY']);

export let searchIssuesTool = readOnlyTool({
  name: 'Search SonarQube Issues',
  key: 'search_sonar_issues_in_projects',
  description:
    "Search for issues (bugs, vulnerabilities, code smells) in my SonarQube projects. Filter by severities=['HIGH','BLOCKER'] for critical issues, impactSoftwareQualities=['SECURITY'] for security, issueStatuses=['OPEN'] to exclude resolved."
})
  .input(
    z.object({
      projects: z
        .array(z.string())
        .optional()
        .describe('An optional list of Sonar projects to look in'),
      files: z
        .array(z.string())
        .optional()
        .describe(
          'An optional list of component keys (files, directories, modules) to filter issues'
        ),
      ...branchPullRequestInputs,
      severities: z
        .array(issueSearchSeveritySchema)
        .optional()
        .describe('An optional list of severities to filter by'),
      impactSoftwareQualities: z
        .array(issueImpactSoftwareQualitySchema)
        .optional()
        .describe('An optional list of software qualities to filter by'),
      issueStatuses: z
        .array(issueStatusSchema)
        .optional()
        .describe(
          'An optional list of issue statuses to filter by. Note: IN_SANDBOX is valid only for SonarQube Server'
        ),
      issueKey: z
        .array(z.string())
        .optional()
        .describe('An optional list of issue keys to fetch specific issues'),
      p: z.number().optional().describe('An optional page number. Defaults to 1.'),
      ps: z
        .number()
        .optional()
        .describe(
          'An optional page size. Must be greater than 0 and less than or equal to 500. Defaults to 100.'
        )
    })
  )
  .output(
    z.object({
      issues: z
        .array(
          z.object({
            key: z.string().describe('Unique issue identifier'),
            rule: z.string().describe('Rule that triggered the issue'),
            project: z.string().describe('Project key where the issue was found'),
            component: z.string().describe('Component (file) where the issue is located'),
            severity: z.string().describe('Issue severity level'),
            status: z.string().describe('Current status of the issue'),
            message: z.string().describe('Issue description message'),
            cleanCodeAttribute: z
              .string()
              .describe('Clean code attribute associated with the issue'),
            cleanCodeAttributeCategory: z.string().describe('Clean code attribute category'),
            author: z.string().describe('Author who introduced the issue'),
            creationDate: z.string().describe('Date when the issue was created'),
            textRange: z
              .object({
                startLine: z.number().describe('Starting line number'),
                endLine: z.number().describe('Ending line number')
              })
              .optional()
              .describe('Location of the issue in the source file')
          })
        )
        .describe('List of issues found in the search'),
      paging: z
        .object({
          pageIndex: z.number().describe('Current page index (1-based)'),
          pageSize: z.number().describe('Number of items per page'),
          total: z.number().describe('Total number of items across all pages')
        })
        .describe('Pagination information for the results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.searchIssues({
      projectKeys: ctx.input.projects,
      files: ctx.input.files,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest,
      severities: ctx.input.severities,
      impactSoftwareQualities: ctx.input.impactSoftwareQualities,
      issueStatuses: ctx.input.issueStatuses,
      issueKeys: ctx.input.issueKey,
      page: ctx.input.p,
      pageSize: ctx.input.ps
    });
    let issues = result.items.map(issue => {
      let textRange =
        typeof issue.textRange === 'object' &&
        issue.textRange !== null &&
        !Array.isArray(issue.textRange)
          ? (issue.textRange as Record<string, unknown>)
          : undefined;
      let startLine =
        typeof textRange?.startLine === 'number' ? textRange.startLine : undefined;
      let endLine = typeof textRange?.endLine === 'number' ? textRange.endLine : undefined;

      return {
        key: String(issue.key ?? ''),
        rule: String(issue.rule ?? ''),
        project: String(issue.project ?? ''),
        component: String(issue.component ?? ''),
        severity: String(issue.severity ?? ''),
        status: String(issue.status ?? ''),
        message: String(issue.message ?? ''),
        cleanCodeAttribute: String(issue.cleanCodeAttribute ?? ''),
        cleanCodeAttributeCategory: String(issue.cleanCodeAttributeCategory ?? ''),
        author: String(issue.author ?? ''),
        creationDate: String(issue.creationDate ?? ''),
        textRange:
          startLine !== undefined && endLine !== undefined
            ? {
                startLine,
                endLine
              }
            : undefined
      };
    });
    let paging = {
      pageIndex: result.page?.page ?? ctx.input.p ?? 1,
      pageSize: result.page?.pageSize ?? ctx.input.ps ?? 100,
      total: result.page?.total ?? issues.length
    };

    return {
      output: {
        issues,
        paging
      },
      message: `Found **${issues.length}** SonarQube issues.`
    };
  })
  .build();

export let manageIssueTool = createSonarTool({
  name: 'Change SonarQube Issue Status',
  key: 'change_sonar_issue_status',
  description:
    'Change the status of an issue. This tool can be used to change the status of an issue to "accept", "falsepositive" or to "reopen" an issue.',
  instructions: [
    'An example request could be: I would like to accept the issue having the key "AX-HMISMFixnZED"'
  ],
  readOnly: false,
  destructive: false
})
  .input(
    z.object({
      key: z.string().describe('The key of the issue which status should be changed'),
      status: issueStatusChangeSchema.describe('The new status of the issue')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      message: z.string().describe('Success or error message'),
      issueKey: z.string().describe('The key of the issue that was updated'),
      newStatus: z.string().describe('The new status of the issue')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.changeIssueStatus({
      issueKey: ctx.input.key,
      transition: ctx.input.status
    });

    let message = 'The issue status was successfully changed.';
    return {
      output: {
        success: true,
        message,
        issueKey: ctx.input.key,
        newStatus: ctx.input.status
      },
      message
    };
  })
  .build();
