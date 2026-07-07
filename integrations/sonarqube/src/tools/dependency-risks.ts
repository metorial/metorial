import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import {
  branchPullRequestInputs,
  createClient,
  projectInput,
  projectKeyFromInput,
  readOnlyTool
} from './shared';

let optionalRecord = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

let requireString = (value: unknown, field: string) => {
  if (typeof value === 'string') return value;
  throw sonarqubeValidationError(
    `SonarQube dependency risk response did not include ${field}.`
  );
};

let optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
let optionalBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

let mapRelease = (release: unknown) => {
  let record = optionalRecord(release);
  if (!record) return undefined;

  return {
    packageName: requireString(record.packageName, 'release packageName'),
    version: requireString(record.version, 'release version'),
    packageManager: requireString(record.packageManager, 'release packageManager'),
    newlyIntroduced: optionalBoolean(record.newlyIntroduced),
    directSummary: optionalBoolean(record.directSummary)
  };
};

let mapAssignee = (assignee: unknown) => {
  let record = optionalRecord(assignee);
  if (!record) return undefined;

  return {
    name: requireString(record.name, 'assignee name')
  };
};

let mapIssueRelease = (issueRelease: unknown) => {
  let record = optionalRecord(issueRelease);
  if (!record) {
    throw sonarqubeValidationError(
      'SonarQube dependency risk response included an invalid issue release.'
    );
  }

  return {
    key: requireString(record.key, 'issue key'),
    severity: requireString(record.severity, 'issue severity'),
    type: requireString(record.type, 'issue type'),
    quality: requireString(record.quality, 'issue quality'),
    status: requireString(record.status, 'issue status'),
    createdAt: requireString(record.createdAt, 'issue createdAt'),
    vulnerabilityId: optionalString(record.vulnerabilityId),
    cvssScore: optionalString(record.cvssScore),
    release: mapRelease(record.release),
    assignee: mapAssignee(record.assignee)
  };
};

let pagingFrom = (value: unknown) => {
  let record = optionalRecord(value);
  if (!record) {
    throw sonarqubeValidationError(
      'SonarQube dependency risk response did not include paging.'
    );
  }

  let pageIndex = record.pageIndex;
  let pageSize = record.pageSize;
  let total = record.total;

  if (
    typeof pageIndex !== 'number' ||
    typeof pageSize !== 'number' ||
    typeof total !== 'number'
  ) {
    throw sonarqubeValidationError(
      'SonarQube dependency risk response included invalid paging.'
    );
  }

  return {
    pageIndex,
    pageSize,
    total
  };
};

export let searchDependencyRisksTool = readOnlyTool({
  name: 'Search SonarQube Dependency Risks',
  key: 'search_dependency_risks',
  description:
    'Search for software composition analysis issues (dependency risks) of a project, paired with releases that appear in the analyzed project, application, or portfolio.'
})
  .input(
    z.object({
      ...projectInput,
      ...branchPullRequestInputs,
      pageIndex: z
        .number()
        .int()
        .optional()
        .describe('An optional page index (1-based). Defaults to 1.'),
      pageSize: z
        .number()
        .int()
        .optional()
        .describe(
          'An optional page size. Must be greater than 0 and less than or equal to 500. Defaults to 100.'
        )
    })
  )
  .output(
    z.object({
      issuesReleases: z
        .array(
          z.object({
            key: z.string().describe('Issue unique key'),
            severity: z.string().describe('Issue severity level'),
            type: z.string().describe('Issue type'),
            quality: z.string().describe('Software quality dimension'),
            status: z.string().describe('Issue status'),
            createdAt: z.string().describe('Creation timestamp'),
            vulnerabilityId: z.string().optional().describe('CVE or vulnerability identifier'),
            cvssScore: z.string().optional().describe('CVSS score'),
            release: z
              .object({
                packageName: z.string().describe('Package name'),
                version: z.string().describe('Package version'),
                packageManager: z.string().describe('Package manager (npm, maven, etc.)'),
                newlyIntroduced: z
                  .boolean()
                  .optional()
                  .describe('Whether this dependency was newly introduced'),
                directSummary: z.boolean().optional().describe('Direct dependency summary')
              })
              .optional()
              .describe('Dependency release information'),
            assignee: z
              .object({
                name: z.string().describe('Assignee name')
              })
              .optional()
              .describe('Issue assignee')
          })
        )
        .describe('List of dependency risk issues'),
      paging: z
        .object({
          pageIndex: z.number().int().describe('Current page index (1-based)'),
          pageSize: z.number().int().describe('Number of items per page'),
          total: z.number().int().describe('Total number of items across all pages')
        })
        .describe('Pagination information for the results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.searchDependencyRisks({
      projectKey: projectKeyFromInput(ctx.config, ctx.input),
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest,
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });
    let issueReleases = Array.isArray(data.issuesReleases)
      ? data.issuesReleases.map(mapIssueRelease)
      : [];
    let paging = pagingFrom(data.page);

    return {
      output: {
        issuesReleases: issueReleases,
        paging
      },
      message: `Found **${issueReleases.length}** SonarQube dependency risks.`
    };
  })
  .build();
