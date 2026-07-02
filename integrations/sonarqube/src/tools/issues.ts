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

let issueSeveritySchema = z.enum(['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO']);
let issueTypeSchema = z.enum(['BUG', 'VULNERABILITY', 'CODE_SMELL']);

type ManageIssueInput = {
  organization?: string;
  issueKey: string;
  action: z.infer<typeof issueActionSchema>;
  transition?: string;
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
  if (!hasValue(input[requiredField])) {
    throw sonarqubeValidationError(`${requiredField} is required for ${input.action}.`);
  }
};

export let searchIssuesTool = readOnlyTool({
  name: 'Search Issues',
  key: 'search_issues',
  description:
    'Search SonarQube issues by issue key, project, component, branch, pull request, status, severity, type, tags, and text query.'
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
        .describe('Project keys to filter issues. Sent as SonarQube projects.'),
      componentKeys: z
        .array(z.string())
        .optional()
        .describe('Component keys to filter issues. Includes matching descendants.'),
      resolved: z.boolean().optional().describe('Filter resolved or unresolved issues.'),
      severities: z
        .array(z.string())
        .optional()
        .describe('Issue severities, for example BLOCKER, CRITICAL, MAJOR, MINOR, INFO.'),
      statuses: z
        .array(z.string())
        .optional()
        .describe('Issue statuses, for example OPEN, CONFIRMED, REOPENED, RESOLVED, CLOSED.'),
      types: z
        .array(z.string())
        .optional()
        .describe('Issue types, for example BUG, VULNERABILITY, or CODE_SMELL.'),
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
    'Get one SonarQube issue by issue key, including normalized issue metadata and raw provider fields.'
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
    'Manage a SonarQube issue workflow: transition, assign, comment, set tags, set severity, or set type. Requires confirmWrite to be true.',
  instructions: [
    'Use search_issues or get_issue first to identify the issue key and current state.',
    'Set confirmWrite to true only when the user explicitly asks to update the issue.'
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
      transition: z
        .string()
        .optional()
        .describe('Required for action=transition. SonarQube transition name.'),
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
        .describe('Required for action=set_tags. Complete tag list for the issue.'),
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
      action: issueActionSchema.describe('Issue workflow action performed.'),
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
        issue: mapIssue(issue),
        raw
      },
      message: `Applied SonarQube issue ${actionLabels[ctx.input.action]} to **${ctx.input.issueKey}**.`
    };
  })
  .build();
