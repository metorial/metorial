import { SlateTool } from 'slates';
import { z } from 'zod';
import { NerdGraphClient } from '../lib/client';
import { spec } from '../spec';

let alertIssueSchema = z.object({
  issueId: z.string().describe('Alert issue ID'),
  title: z.string().optional().describe('Primary issue title'),
  titles: z.array(z.string()).optional().describe('All issue titles returned by New Relic'),
  state: z
    .string()
    .optional()
    .describe('Issue state, such as CREATED, ACTIVATED, DEACTIVATED, or CLOSED'),
  priority: z
    .string()
    .optional()
    .describe('Issue priority, such as LOW, MEDIUM, HIGH, or CRITICAL'),
  createdAt: z.number().optional().describe('Issue creation time in epoch milliseconds'),
  activatedAt: z.number().optional().describe('Issue activation time in epoch milliseconds'),
  closedAt: z.number().optional().describe('Issue close time in epoch milliseconds'),
  acknowledgedAt: z
    .number()
    .optional()
    .describe('Issue acknowledgement time in epoch milliseconds'),
  updatedAt: z.number().optional().describe('Issue update time in epoch milliseconds'),
  accountIds: z.array(z.number()).optional().describe('Accounts associated with this issue'),
  entityGuids: z.array(z.string()).optional().describe('Related entity GUIDs'),
  entityNames: z.array(z.string()).optional().describe('Related entity names'),
  entityTypes: z.array(z.string()).optional().describe('Related entity types'),
  isCorrelated: z.boolean().optional().describe('Whether New Relic correlated this issue'),
  mutingState: z
    .string()
    .optional()
    .describe('Issue muting state, such as NOT_MUTED, FULLY_MUTED, or PARTIALLY_MUTED'),
  policyIds: z.array(z.number()).optional().describe('Alert policy IDs related to this issue'),
  sources: z.array(z.string()).optional().describe('Issue sources'),
  totalIncidents: z
    .number()
    .optional()
    .describe('Number of incidents correlated into the issue')
});

let toStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export let listAlertIssues = SlateTool.create(spec, {
  name: 'List Alert Issues',
  key: 'list_alert_issues',
  description:
    'List and filter New Relic alert issues for the configured account. Use this to inspect active, deactivated, and closed issue state from incident intelligence.',
  instructions: [
    'Leave filters empty to list recent issues.',
    'Use filters such as `states`, `priorities`, `entityGuids`, `entityTypes`, `issueIds`, `policyIds`, `conditionIds`, `sources`, `mutingStates`, `contains`, `isAcknowledged`, or `isCorrelated` to narrow results.',
    'Use `timeWindow.startTime` and `timeWindow.endTime` in epoch milliseconds to constrain the issue search window.',
    'Use `nextCursor` from the output as `cursor` to fetch another page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      states: z
        .array(z.enum(['CREATED', 'ACTIVATED', 'DEACTIVATED', 'CLOSED']))
        .optional()
        .describe('Issue states to include'),
      priorities: z
        .array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']))
        .optional()
        .describe('Issue priorities to include'),
      entityGuids: z.array(z.string()).optional().describe('Entity GUIDs to filter issues by'),
      entityTypes: z.array(z.string()).optional().describe('Entity types to filter issues by'),
      issueIds: z.array(z.string()).optional().describe('Specific issue IDs to retrieve'),
      conditionIds: z
        .array(z.number())
        .optional()
        .describe('Alert condition IDs to filter issues by'),
      contains: z
        .string()
        .optional()
        .describe('Text search term used by New Relic to match issue content'),
      isAcknowledged: z.boolean().optional().describe('Filter by acknowledgement state'),
      isCorrelated: z.boolean().optional().describe('Filter by correlation state'),
      mutingStates: z
        .array(z.enum(['FULLY_MUTED', 'NOT_MUTED', 'PARTIALLY_MUTED']))
        .optional()
        .describe('Issue muting states to include'),
      policyIds: z
        .array(z.number())
        .optional()
        .describe('Alert policy IDs to filter issues by'),
      sources: z.array(z.string()).optional().describe('Issue sources to filter by'),
      timeWindow: z
        .object({
          startTime: z
            .number()
            .describe('Start of the issue search window in epoch milliseconds'),
          endTime: z.number().describe('End of the issue search window in epoch milliseconds')
        })
        .optional()
        .describe('Time window used to filter issues'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      issues: z.array(alertIssueSchema).describe('Alert issues returned by New Relic'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NerdGraphClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      accountId: ctx.config.accountId
    });

    ctx.progress('Listing alert issues...');
    let result = await client.listAlertIssues({
      cursor: ctx.input.cursor,
      filter: {
        states: ctx.input.states,
        priorities: ctx.input.priorities,
        entityGuids: ctx.input.entityGuids,
        entityTypes: ctx.input.entityTypes,
        issueIds: ctx.input.issueIds,
        conditionIds: ctx.input.conditionIds,
        contains: ctx.input.contains,
        isAcknowledged: ctx.input.isAcknowledged,
        isCorrelated: ctx.input.isCorrelated,
        mutingStates: ctx.input.mutingStates,
        policyIds: ctx.input.policyIds,
        sources: ctx.input.sources
      },
      timeWindow: ctx.input.timeWindow
    });

    let issues = (result?.issues || []).map((issue: any) => {
      let titles = toStringArray(issue.title);
      return {
        issueId: issue.issueId?.toString(),
        title: titles[0],
        titles,
        state: issue.state,
        priority: issue.priority,
        createdAt: issue.createdAt,
        activatedAt: issue.activatedAt,
        closedAt: issue.closedAt,
        acknowledgedAt: issue.acknowledgedAt,
        updatedAt: issue.updatedAt,
        accountIds: issue.accountIds,
        entityGuids: issue.entityGuids,
        entityNames: issue.entityNames,
        entityTypes: issue.entityTypes,
        isCorrelated: issue.isCorrelated,
        mutingState: issue.mutingState,
        policyIds: issue.policyIds,
        sources: issue.sources,
        totalIncidents: issue.totalIncidents
      };
    });

    return {
      output: {
        issues,
        nextCursor: result?.nextCursor || undefined
      },
      message: `Found **${issues.length}** alert issue(s).`
    };
  })
  .build();
