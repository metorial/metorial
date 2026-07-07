import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import { createClient, projectInput, projectKeyFromInput, readOnlyTool } from './shared';

export let searchProjectsTool = readOnlyTool({
  name: 'Search My SonarQube Projects',
  key: 'search_my_sonarqube_projects',
  description:
    'Find SonarQube projects in your organization or instance. Supports searching by project name or key. Use this first when projectKey is unknown - most other tools require the project key from this response.'
})
  .input(
    z.object({
      page: z.number().optional().describe('An optional page number. Defaults to 1.'),
      pageSize: z
        .number()
        .optional()
        .describe(
          'An optional page size. Must be greater than 0 and less than or equal to 500. Defaults to 500.'
        ),
      q: z
        .string()
        .optional()
        .describe(
          'An optional search query to filter projects by name (partial match) or key (exact match).'
        )
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            key: z.string().describe('Unique project key'),
            name: z.string().describe('Project display name')
          })
        )
        .describe('List of projects found'),
      paging: z
        .object({
          pageIndex: z.number().int().describe('Current page index (1-based)'),
          pageSize: z.number().int().describe('Number of items per page'),
          total: z.number().int().describe('Total number of items across all pages'),
          hasNextPage: z.boolean().describe('Whether there are more pages available')
        })
        .describe('Pagination information for the results')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.pageSize !== undefined &&
      (ctx.input.pageSize <= 0 || ctx.input.pageSize > 500)
    ) {
      throw sonarqubeValidationError(
        'Page size must be greater than 0 and less than or equal to 500.'
      );
    }

    let client = createClient(ctx);
    let result = await client.searchProjects({
      query: ctx.input.q,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    let projects = result.items.map(project => ({
      key: String(project.key ?? ''),
      name: typeof project.name === 'string' ? project.name : String(project.name ?? '')
    }));
    let pageIndex = result.page?.page ?? ctx.input.page ?? 1;
    let pageSize = result.page?.pageSize ?? ctx.input.pageSize ?? 500;
    let total = result.page?.total ?? projects.length;
    let hasNextPage = result.page?.hasNextPage ?? pageIndex * pageSize < total;

    return {
      output: {
        projects,
        paging: {
          pageIndex,
          pageSize,
          total,
          hasNextPage
        }
      },
      message: `Found **${projects.length}** SonarQube projects.`
    };
  })
  .build();

export let listProjectBranchesTool = readOnlyTool({
  name: 'List SonarQube Branches',
  key: 'list_branches',
  description:
    'List long-lived branches for a project (e.g. main, develop, master). Use returned branch names as the branch parameter on other tools (e.g. get_project_quality_gate_status, get_component_measures). For pull requests, use list_pull_requests instead.'
})
  .input(z.object(projectInput))
  .output(
    z.object({
      projectKey: z.string().describe('Project key'),
      totalBranches: z.number().int().describe('Total number of branches'),
      branches: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Branch name that can be used with other tools as the branch parameter'
              ),
            isMain: z.boolean().describe('Whether this is the main branch'),
            type: z
              .enum(['LONG', 'SHORT', 'BRANCH'])
              .optional()
              .describe(
                'Branch type in SonarQube (LONG on SonarQube Cloud, BRANCH on SonarQube Server)'
              ),
            qualityGateStatus: z
              .enum(['OK', 'ERROR', 'WARN', 'NONE'])
              .optional()
              .describe('Quality gate status for this branch'),
            analysisDate: z.string().optional().describe('Date of the last analysis'),
            branchId: z.string().describe('Internal branch identifier')
          })
        )
        .describe('List of branches for this project')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let result = await client.listProjectBranches(projectKey);
    let branchTypes = ['LONG', 'SHORT', 'BRANCH'] as const;
    let qualityGateStatuses = ['OK', 'ERROR', 'WARN', 'NONE'] as const;
    let isBranchType = (value: unknown): value is (typeof branchTypes)[number] =>
      typeof value === 'string' && branchTypes.includes(value as (typeof branchTypes)[number]);
    let isQualityGateStatus = (
      value: unknown
    ): value is (typeof qualityGateStatuses)[number] =>
      typeof value === 'string' &&
      qualityGateStatuses.includes(value as (typeof qualityGateStatuses)[number]);
    let branches = result.items.map(branch => {
      let type = isBranchType(branch.type) ? branch.type : undefined;
      let status = branch.status;
      let statusValue =
        typeof status === 'object' && status !== null && 'qualityGateStatus' in status
          ? status.qualityGateStatus
          : undefined;
      let qualityGateStatus = isQualityGateStatus(statusValue) ? statusValue : undefined;

      return {
        name: String(branch.name ?? ''),
        isMain: branch.isMain === true,
        type,
        qualityGateStatus,
        analysisDate:
          typeof branch.analysisDate === 'string' ? branch.analysisDate : undefined,
        branchId: String(branch.branchId ?? '')
      };
    });

    return {
      output: {
        projectKey,
        totalBranches: branches.length,
        branches
      },
      message: `Found **${branches.length}** branches for SonarQube project **${projectKey}**.`
    };
  })
  .build();

export let listProjectPullRequestsTool = readOnlyTool({
  name: 'List SonarQube Pull Requests',
  key: 'list_pull_requests',
  description:
    'List all pull requests for a project. Use this tool to discover available pull requests and their corresponding branch names before analyzing their coverage, issues, or quality. Returns the pull request key/ID and source branch for each PR, which can be used with other tools that accept a pullRequest parameter. For long-lived branches (main, develop), use list_branches instead.'
})
  .input(z.object(projectInput))
  .output(
    z.object({
      projectKey: z.string().describe('Project key'),
      totalPullRequests: z.number().int().describe('Total number of pull requests'),
      pullRequests: z
        .array(
          z.object({
            key: z
              .string()
              .describe(
                'Pull request key/ID that can be used with other tools as the pullRequest parameter'
              ),
            title: z.string().describe('Pull request title'),
            branch: z.string().describe('Source branch name associated with this pull request')
          })
        )
        .describe('List of pull requests for this project')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let result = await client.listProjectPullRequests(projectKey);
    let pullRequests = result.items.map(pullRequest => ({
      key: String(pullRequest.key ?? ''),
      title: String(pullRequest.title ?? ''),
      branch: String(pullRequest.branch ?? '')
    }));

    return {
      output: {
        projectKey,
        totalPullRequests: pullRequests.length,
        pullRequests
      },
      message: `Found **${pullRequests.length}** pull requests for SonarQube project **${projectKey}**.`
    };
  })
  .build();
