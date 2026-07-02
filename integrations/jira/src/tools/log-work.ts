import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { jiraServiceError } from '../lib/errors';
import { spec } from '../spec';

export let logWorkTool = SlateTool.create(spec, {
  name: 'Log Work',
  key: 'log_work',
  description: `Log time spent on a Jira issue. Provide time as a human-readable string (e.g., "2h 30m") or in seconds. Optionally include a start timestamp and comment.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('The issue key or ID to log work on.'),
      timeSpent: z
        .string()
        .optional()
        .describe('Time spent in Jira format (e.g., "2h 30m", "1d", "45m").'),
      timeSpentSeconds: z
        .number()
        .positive()
        .optional()
        .describe('Time spent in seconds (alternative to timeSpent).'),
      started: z
        .string()
        .optional()
        .describe(
          'When the work started in ISO 8601 format (e.g., "2024-01-15T09:00:00.000+0000"). Defaults to now.'
        ),
      comment: z.string().optional().describe('Optional worklog comment.')
    })
  )
  .output(
    z.object({
      worklogId: z.string().describe('The ID of the created worklog.'),
      issueIdOrKey: z.string().describe('The issue key or ID.'),
      timeSpent: z.string().optional().describe('The time spent as formatted by Jira.'),
      timeSpentSeconds: z.number().optional().describe('The time spent in seconds.'),
      authorDisplayName: z.string().optional().describe('The worklog author display name.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    if (!ctx.input.timeSpent && ctx.input.timeSpentSeconds === undefined) {
      throw jiraServiceError('Provide either timeSpent or timeSpentSeconds to log work.');
    }

    let worklog: Record<string, any> = {};

    if (ctx.input.timeSpent) {
      worklog.timeSpent = ctx.input.timeSpent;
    }
    if (ctx.input.timeSpentSeconds !== undefined) {
      worklog.timeSpentSeconds = ctx.input.timeSpentSeconds;
    }
    if (ctx.input.started) {
      worklog.started = ctx.input.started;
    }
    if (ctx.input.comment) {
      worklog.comment = {
        version: 1,
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: ctx.input.comment }] }]
      };
    }

    let result = await client.addWorklog(ctx.input.issueIdOrKey, worklog);

    return {
      output: {
        worklogId: result.id,
        issueIdOrKey: ctx.input.issueIdOrKey,
        timeSpent: result.timeSpent,
        timeSpentSeconds: result.timeSpentSeconds,
        authorDisplayName: result.author?.displayName
      },
      message: `Logged **${result.timeSpent ?? ctx.input.timeSpent}** on **${ctx.input.issueIdOrKey}**.`
    };
  })
  .build();

export let listWorklogsTool = SlateTool.create(spec, {
  name: 'List Worklogs',
  key: 'list_worklogs',
  description: `List worklogs for a Jira issue with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('The issue key or ID.'),
      startAt: z.number().optional().default(0).describe('Pagination start index.'),
      maxResults: z.number().optional().default(50).describe('Maximum worklogs to return.')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of worklogs.'),
      worklogs: z.array(
        z.object({
          worklogId: z.string().describe('The worklog ID.'),
          authorDisplayName: z
            .string()
            .optional()
            .describe('The worklog author display name.'),
          timeSpent: z.string().optional().describe('The time spent as formatted by Jira.'),
          timeSpentSeconds: z.number().optional().describe('The time spent in seconds.'),
          started: z.string().optional().describe('When the work started.'),
          created: z.string().optional().describe('Creation timestamp.'),
          updated: z.string().optional().describe('Last updated timestamp.'),
          comment: z.any().optional().describe('Worklog comment in ADF format.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let result = await client.getWorklogs(ctx.input.issueIdOrKey, {
      startAt: ctx.input.startAt,
      maxResults: ctx.input.maxResults
    });

    let worklogs = (result.worklogs ?? []).map((worklog: any) => ({
      worklogId: worklog.id,
      authorDisplayName: worklog.author?.displayName,
      timeSpent: worklog.timeSpent,
      timeSpentSeconds: worklog.timeSpentSeconds,
      started: worklog.started,
      created: worklog.created,
      updated: worklog.updated,
      comment: worklog.comment
    }));

    return {
      output: {
        total: result.total ?? worklogs.length,
        worklogs
      },
      message: `Found **${result.total ?? worklogs.length}** worklogs on **${ctx.input.issueIdOrKey}**. Returned ${worklogs.length}.`
    };
  })
  .build();

export let updateWorklogTool = SlateTool.create(spec, {
  name: 'Update Worklog',
  key: 'update_worklog',
  description: `Update time spent, start time, or comment for an existing Jira issue worklog.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('The issue key or ID containing the worklog.'),
      worklogId: z.string().describe('The worklog ID to update.'),
      timeSpent: z
        .string()
        .optional()
        .describe('Updated time spent in Jira format (e.g., "2h 30m", "1d", "45m").'),
      timeSpentSeconds: z
        .number()
        .positive()
        .optional()
        .describe('Updated time spent in seconds.'),
      started: z.string().optional().describe('Updated start timestamp in ISO 8601 format.'),
      comment: z.string().optional().describe('Updated worklog comment.')
    })
  )
  .output(
    z.object({
      worklogId: z.string().describe('The updated worklog ID.'),
      issueIdOrKey: z.string().describe('The issue key or ID.'),
      timeSpent: z.string().optional().describe('The time spent as formatted by Jira.'),
      timeSpentSeconds: z.number().optional().describe('The time spent in seconds.'),
      updated: z.string().optional().describe('Last updated timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    if (
      !ctx.input.timeSpent &&
      ctx.input.timeSpentSeconds === undefined &&
      !ctx.input.started &&
      !ctx.input.comment
    ) {
      throw jiraServiceError(
        'Provide timeSpent, timeSpentSeconds, started, or comment to update a worklog.'
      );
    }

    let worklog: Record<string, any> = {};
    if (ctx.input.timeSpent) worklog.timeSpent = ctx.input.timeSpent;
    if (ctx.input.timeSpentSeconds !== undefined) {
      worklog.timeSpentSeconds = ctx.input.timeSpentSeconds;
    }
    if (ctx.input.started) worklog.started = ctx.input.started;
    if (ctx.input.comment) {
      worklog.comment = {
        version: 1,
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: ctx.input.comment }] }]
      };
    }

    let result = await client.updateWorklog(
      ctx.input.issueIdOrKey,
      ctx.input.worklogId,
      worklog
    );

    return {
      output: {
        worklogId: result.id,
        issueIdOrKey: ctx.input.issueIdOrKey,
        timeSpent: result.timeSpent,
        timeSpentSeconds: result.timeSpentSeconds,
        updated: result.updated
      },
      message: `Updated worklog **${result.id}** on **${ctx.input.issueIdOrKey}**.`
    };
  })
  .build();

export let deleteWorklogTool = SlateTool.create(spec, {
  name: 'Delete Worklog',
  key: 'delete_worklog',
  description: `Delete a worklog from a Jira issue.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('The issue key or ID containing the worklog.'),
      worklogId: z.string().describe('The worklog ID to delete.')
    })
  )
  .output(
    z.object({
      issueIdOrKey: z.string().describe('The issue key or ID.'),
      worklogId: z.string().describe('The deleted worklog ID.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    await client.deleteWorklog(ctx.input.issueIdOrKey, ctx.input.worklogId);

    return {
      output: {
        issueIdOrKey: ctx.input.issueIdOrKey,
        worklogId: ctx.input.worklogId
      },
      message: `Deleted worklog **${ctx.input.worklogId}** from **${ctx.input.issueIdOrKey}**.`
    };
  })
  .build();
