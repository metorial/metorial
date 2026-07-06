import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import {
  branchPullRequestInputs,
  createClient,
  createSonarTool,
  historySchema,
  issueSchema,
  mapHistory,
  mapIssue,
  pageSchema,
  paginationInputs,
  rawRecordSchema,
  readOnlyTool
} from './shared';

let issueActionSchema = z.enum([
  'transition',
  'assign',
  'comment',
  'set_tags',
  'set_severity',
  'set_type'
]);

let issueTransitionSchema = z.enum(['accept', 'falsepositive', 'reopen']);
let issueSeveritySchema = z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO']);
let issueSearchSeveritySchema = z.enum([
  'INFO',
  'LOW',
  'MEDIUM',
  'HIGH',
  'BLOCKER',
  'CRITICAL',
  'MAJOR',
  'MINOR'
]);
let issueTypeSchema = z.enum(['BUG', 'VULNERABILITY', 'CODE_SMELL']);
let issueStatusSchema = z.enum([
  'OPEN',
  'CONFIRMED',
  'FALSE_POSITIVE',
  'ACCEPTED',
  'FIXED',
  'IN_SANDBOX'
]);
let issueImpactSoftwareQualitySchema = z.enum(['MAINTAINABILITY', 'RELIABILITY', 'SECURITY']);
let issueImpactSeveritySchema = z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'BLOCKER']);

type ManageIssueInput = {
  organization?: string;
  issueKey: string;
  action: z.infer<typeof issueActionSchema>;
  transition?: z.infer<typeof issueTransitionSchema>;
  assignee?: string;
  comment?: string;
  tags?: string[];
  severity?: z.infer<typeof issueSeveritySchema>;
  type?: z.infer<typeof issueTypeSchema>;
  confirmWrite?: boolean;
};

let actionFields: Record<ManageIssueInput['action'], Array<keyof ManageIssueInput>> = {
  transition: ['transition'],
  assign: ['assignee'],
  comment: ['comment'],
  set_tags: ['tags'],
  set_severity: ['severity'],
  set_type: ['type']
};

let actionLabels: Record<ManageIssueInput['action'], string> = {
  transition: 'transition',
  assign: 'assignment',
  comment: 'comment',
  set_tags: 'tag update',
  set_severity: 'severity update',
  set_type: 'type update'
};

let hasValue = (value: unknown) =>
  value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0);

export let validateManageIssueInput = (input: ManageIssueInput) => {
  if (input.confirmWrite !== true) {
    throw sonarqubeValidationError('confirmWrite must be true to manage a SonarQube issue.');
  }

  let allowed = new Set<keyof ManageIssueInput>([
    'organization',
    'issueKey',
    'action',
    'confirmWrite',
    ...actionFields[input.action]
  ]);
  let optionalFields: Array<keyof ManageIssueInput> = [
    'transition',
    'assignee',
    'comment',
    'tags',
    'severity',
    'type'
  ];

  for (let field of optionalFields) {
    if (!allowed.has(field) && hasValue(input[field])) {
      throw sonarqubeValidationError(`${field} cannot be provided for ${input.action}.`);
    }
  }

  let requiredField = actionFields[input.action][0]!;
  if (requiredField === 'tags' && !Array.isArray(input.tags)) {
    throw sonarqubeValidationError(`${requiredField} is required for ${input.action}.`);
  }
  if (requiredField !== 'tags' && !hasValue(input[requiredField])) {
    throw sonarqubeValidationError(`${requiredField} is required for ${input.action}.`);
  }
};

export let searchIssuesTool = readOnlyTool({
  name: 'Search Issues',
  key: 'search_issues',
  description:
    'Search SonarQube issues by issue key, exact project/component keys, branch or pull request, issue status, software quality, impact severity, type, tags, and text query. Use search_projects for project names and list_component_tree for file or directory names when keys are unknown.'
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('SonarQube Cloud organization key. Defaults to config.organization.'),
      issueKeys: z
        .array(z.string())
        .optional()
        .describe('Specific SonarQube issue keys to retrieve. Sent as SonarQube issues.'),
      projectKeys: z
        .array(z.string())
        .optional()
        .describe(
          'Exact project keys to filter issues. Use search_projects to discover valid keys.'
        ),
      componentKeys: z
        .array(z.string())
        .optional()
        .describe(
          'Exact component keys to filter issues. Use list_component_tree to discover file or directory component keys. Combined with projectKeys.'
        ),
      files: z
        .array(z.string())
        .optional()
        .describe(
          'Exact file component keys to filter issues. Combined with projectKeys and componentKeys.'
        ),
      resolved: z.boolean().optional().describe('Filter resolved or unresolved issues.'),
      severities: z
        .array(issueSearchSeveritySchema)
        .optional()
        .describe(
          'Severity filters. Current Sonar severities INFO, LOW, MEDIUM, HIGH, and BLOCKER are sent as impactSeverities. Legacy severities CRITICAL, MAJOR, and MINOR are sent as severities. Do not mix current and legacy values.'
        ),
      statuses: z
        .array(z.string())
        .optional()
        .describe(
          'Legacy issue statuses, for example OPEN, CONFIRMED, REOPENED, RESOLVED, CLOSED.'
        ),
      issueStatuses: z
        .array(issueStatusSchema)
        .optional()
        .describe(
          'Current issue statuses, for example OPEN, ACCEPTED, FALSE_POSITIVE, or FIXED.'
        ),
      impactSoftwareQualities: z
        .array(issueImpactSoftwareQualitySchema)
        .optional()
        .describe(
          'Software qualities impacted by matching issues, for example SECURITY or RELIABILITY.'
        ),
      impactSeverities: z
        .array(issueImpactSeveritySchema)
        .optional()
        .describe('Software quality impact severities, for example LOW, MEDIUM, or HIGH.'),
      types: z
        .array(issueTypeSchema)
        .optional()
        .describe(
          'Supported issue types: BUG, VULNERABILITY, or CODE_SMELL. SonarQube does not accept SECURITY_HOTSPOT here; use search_hotspots for legacy hotspots or impactSoftwareQualities=["SECURITY"] for security issues.'
        ),
      tags: z.array(z.string()).optional().describe('Issue tags to filter by.'),
      query: z.string().optional().describe('Text query for issues. Sent as SonarQube q.'),
      ...branchPullRequestInputs,
      ...paginationInputs(100, 500)
    })
  )
  .output(
    z.object({
      issues: z.array(issueSchema).describe('Matching SonarQube issues.'),
      page: pageSchema.optional().describe('Pagination details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.searchIssues(ctx.input);
    let issues = result.items.map(mapIssue);

    return {
      output: {
        issues,
        page: result.page
      },
      message: `Found **${issues.length}** SonarQube issues.`
    };
  })
  .build();

export let getIssueTool = readOnlyTool({
  name: 'Get Issue',
  key: 'get_issue',
  description:
    'Read one SonarQube issue by exact issue key without changing it. Use search_issues first when the issue key is unknown.'
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('SonarQube Cloud organization key. Defaults to config.organization.'),
      issueKey: z.string().describe('SonarQube issue key.')
    })
  )
  .output(
    z.object({
      issue: issueSchema.describe('Matching SonarQube issue.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let issue = await client.getIssue(ctx.input.issueKey, ctx.input.organization);

    return {
      output: {
        issue: mapIssue(issue),
        raw: issue
      },
      message: `Retrieved SonarQube issue **${ctx.input.issueKey}**.`
    };
  })
  .build();

export let getIssueChangelogTool = readOnlyTool({
  name: 'Get Issue Changelog',
  key: 'get_issue_changelog',
  description:
    'Get the changelog for a SonarQube issue, including workflow transitions, comments, assignments, and field changes when returned.'
})
  .input(
    z.object({
      issueKey: z.string().describe('SonarQube issue key.')
    })
  )
  .output(
    z.object({
      issueKey: z.string().describe('Issue key used for the request.'),
      history: z.array(historySchema).describe('Issue history entries.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getIssueChangelog(ctx.input.issueKey);
    let history = Array.isArray(data.changelog)
      ? data.changelog
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          )
          .map(mapHistory)
      : [];

    return {
      output: {
        issueKey: ctx.input.issueKey,
        history,
        raw: data
      },
      message: `Retrieved **${history.length}** changelog entries for SonarQube issue **${ctx.input.issueKey}**.`
    };
  })
  .build();

export let manageIssueTool = createSonarTool({
  name: 'Manage Issue',
  key: 'manage_issue',
  description:
    'Perform exactly one SonarQube issue mutation: transition, assign, comment, set tags, set severity, or set type. Requires confirmWrite=true and the matching action-specific field.',
  instructions: [
    'Use search_issues or get_issue first when the issue key or current state is unknown.',
    'When the user already provided an exact issue key and explicitly asks to update it, call manage_issue directly.',
    'Set confirmWrite to true only when the user explicitly asks to update the issue.',
    'Provide only the field required by the selected action; for set_tags, tags is the complete replacement list and [] clears all tags.'
  ],
  readOnly: false,
  destructive: false
})
  .input(
    z.object({
      issueKey: z.string().describe('SonarQube issue key.'),
      organization: z
        .string()
        .optional()
        .describe('SonarQube Cloud organization key used for readback after mutation.'),
      action: issueActionSchema.describe('Issue workflow action to perform.'),
      transition: issueTransitionSchema
        .optional()
        .describe(
          'Required for action=transition. Official SonarQube issue status transition: accept, falsepositive, or reopen.'
        ),
      assignee: z
        .string()
        .optional()
        .describe('Required for action=assign. SonarQube user login to assign.'),
      comment: z
        .string()
        .optional()
        .describe('Required for action=comment. Comment text to add to the issue.'),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          'Required for action=set_tags. Complete tag list for the issue; an empty list clears all tags.'
        ),
      severity: issueSeveritySchema
        .optional()
        .describe('Required for action=set_severity. New issue severity.'),
      type: issueTypeSchema
        .optional()
        .describe('Required for action=set_type. New issue type.'),
      confirmWrite: z
        .boolean()
        .optional()
        .describe('Must be true to perform a SonarQube issue mutation.')
    })
  )
  .output(
    z.object({
      issueKey: z.string().describe('Issue key used for the request.'),
      key: z.string().optional().describe('Issue key returned for transition updates.'),
      action: issueActionSchema.describe('Issue workflow action performed.'),
      success: z.boolean().optional().describe('Whether the mutation completed.'),
      status: z.string().optional().describe('Requested issue transition status.'),
      message: z.string().optional().describe('Mutation result message.'),
      issue: issueSchema.optional().describe('Issue state returned or read after mutation.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    validateManageIssueInput(ctx.input);
    let client = createClient(ctx);

    let raw: Record<string, unknown>;
    if (ctx.input.action === 'transition') {
      raw = await client.transitionIssue({
        issueKey: ctx.input.issueKey,
        transition: ctx.input.transition as string
      });
      let message = `Applied SonarQube issue transition **${ctx.input.transition}** to **${ctx.input.issueKey}**.`;
      return {
        output: {
          issueKey: ctx.input.issueKey,
          key: ctx.input.issueKey,
          action: ctx.input.action,
          success: true,
          status: ctx.input.transition,
          message,
          raw
        },
        message
      };
    } else if (ctx.input.action === 'assign') {
      raw = await client.assignIssue({
        issueKey: ctx.input.issueKey,
        assignee: ctx.input.assignee as string
      });
    } else if (ctx.input.action === 'comment') {
      raw = await client.addIssueComment({
        issueKey: ctx.input.issueKey,
        comment: ctx.input.comment as string
      });
    } else if (ctx.input.action === 'set_tags') {
      raw = await client.setIssueTags({
        issueKey: ctx.input.issueKey,
        tags: ctx.input.tags as string[]
      });
    } else if (ctx.input.action === 'set_severity') {
      raw = await client.setIssueSeverity({
        issueKey: ctx.input.issueKey,
        severity: ctx.input.severity as string
      });
    } else {
      raw = await client.setIssueType({
        issueKey: ctx.input.issueKey,
        type: ctx.input.type as string
      });
    }

    let issue = await client.getIssue(ctx.input.issueKey, ctx.input.organization);

    return {
      output: {
        issueKey: ctx.input.issueKey,
        action: ctx.input.action,
        success: true,
        issue: mapIssue(issue),
        raw
      },
      message: `Applied SonarQube issue ${actionLabels[ctx.input.action]} to **${ctx.input.issueKey}**.`
    };
  })
  .build();
