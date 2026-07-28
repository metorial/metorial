import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import { createClient, projectInput, projectKeyFromInput, readOnlyTool } from './shared';

const branchTypeFilterValues = ['ALL', 'LONG', 'SHORT'] as const;
type BranchTypeFilter = (typeof branchTypeFilterValues)[number];

const branchTypes = ['LONG', 'SHORT', 'BRANCH'] as const;
const qualityGateStatuses = ['OK', 'ERROR', 'WARN', 'NONE'] as const;

const isBranchType = (value: unknown): value is (typeof branchTypes)[number] =>
  typeof value === 'string' && branchTypes.includes(value as (typeof branchTypes)[number]);

const isQualityGateStatus = (value: unknown): value is (typeof qualityGateStatuses)[number] =>
  typeof value === 'string' &&
  qualityGateStatuses.includes(value as (typeof qualityGateStatuses)[number]);

const matchesBranchTypesFilter = (
  branch: Record<string, unknown>,
  filter: BranchTypeFilter | undefined
) => {
  if (filter === undefined || filter === 'ALL') return true;
  if (filter === 'LONG') return branch.type === 'LONG' || branch.type === 'BRANCH';
  return branch.type === 'SHORT';
};

const branchTypesFilterFromInput = (
  value: string | undefined
): BranchTypeFilter | undefined => {
  if (value === undefined) return undefined;
  if (branchTypeFilterValues.includes(value as BranchTypeFilter)) {
    return value as BranchTypeFilter;
  }
  throw sonarqubeValidationError('branchTypes must be one of ALL, LONG, or SHORT.');
};

const mapProjectBranch = (branch: Record<string, unknown>) => {
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
    analysisDate: typeof branch.analysisDate === 'string' ? branch.analysisDate : undefined,
    branchId: String(branch.branchId ?? ''),
    mergeBranch: typeof branch.mergeBranch === 'string' ? branch.mergeBranch : undefined
  };
};

export let searchProjectsTool = readOnlyTool({
  name: 'Search My SonarQube Projects',
  key: 'search_my_sonarqube_projects',
  description:
    'Find SonarQube projects in your organization or instance. Supports searching by project name or key. Use this first when projectKey is unknown - most other tools require the project key from this response.'
})
  .input(
    z.object({
      pageIndex: z.number().optional().describe('An optional page number. Defaults to 1.'),
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
      page: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });
    let projects = result.items.map(project => ({
      key: String(project.key ?? ''),
      name: typeof project.name === 'string' ? project.name : String(project.name ?? '')
    }));
    let pageIndex = result.page?.page ?? ctx.input.pageIndex ?? 1;
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
    'List analyzed branches for a SonarQube project. Returns long-lived branches such as main and develop plus short-lived SonarQube Cloud branches analyzed without a pull request. Use returned branch names as the branch parameter on other tools (e.g. get_project_quality_gate_status, get_component_measures). Use branchTypes to narrow Cloud results, or list_pull_requests for pull request analysis.'
})
  .input(
    z.object({
      ...projectInput,
      branchTypes: z
        .string()
        .optional()
        .describe(
          'Filter branches by type. ALL (default) returns all analyzed branches; LONG returns long-lived branches only; SHORT returns short-lived branches only.'
        )
    })
  )
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
                'Branch type in SonarQube (LONG or SHORT on SonarQube Cloud, BRANCH on SonarQube Server)'
              ),
            qualityGateStatus: z
              .enum(['OK', 'ERROR', 'WARN', 'NONE'])
              .optional()
              .describe('Quality gate status for this branch'),
            analysisDate: z.string().optional().describe('Date of the last analysis'),
            branchId: z.string().describe('Internal branch identifier'),
            mergeBranch: z
              .string()
              .optional()
              .describe('Target branch for a short-lived branch, such as main or master')
          })
        )
        .describe('List of branches for this project')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let branchTypesFilter = branchTypesFilterFromInput(ctx.input.branchTypes);
    let client = createClient(ctx);
    let result = await client.listProjectBranches(projectKey);
    let branches = result.items
      .filter(branch => matchesBranchTypesFilter(branch, branchTypesFilter))
      .map(mapProjectBranch);

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
