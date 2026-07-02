import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let issueEvents = SlateTrigger.create(spec, {
  name: 'Issue Events',
  key: 'issue_events',
  description:
    'Triggers on issue-related events including creation, updates, assignment changes, label changes, milestone changes, and comments.'
})
  .input(
    z.object({
      eventType: z.string().describe('Gitea event header value'),
      action: z
        .string()
        .describe('Sub-action (opened, edited, closed, reopened, assigned, etc.)'),
      issueNumber: z.number().describe('Issue number'),
      issueTitle: z.string().describe('Issue title'),
      issueBody: z.string().describe('Issue body'),
      issueState: z.string().describe('Issue state'),
      issueHtmlUrl: z.string().describe('Issue URL'),
      authorLogin: z.string().describe('Issue author'),
      senderLogin: z.string().describe('User who triggered the event'),
      repositoryFullName: z.string().describe('Full repository name'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name'),
      labels: z.array(z.string()).describe('Current label names'),
      assignees: z.array(z.string()).describe('Current assignee usernames'),
      milestoneTitle: z.string().optional().describe('Current milestone title'),
      commentBody: z.string().optional().describe('Comment body if this is a comment event'),
      commentId: z.number().optional().describe('Comment ID if this is a comment event')
    })
  )
  .output(
    z.object({
      action: z
        .string()
        .describe(
          'Event action (opened, edited, closed, reopened, assigned, label_updated, milestoned, commented)'
        ),
      issueNumber: z.number().describe('Issue number'),
      issueTitle: z.string().describe('Issue title'),
      issueBody: z.string().describe('Issue body'),
      issueState: z.string().describe('Issue state'),
      issueHtmlUrl: z.string().describe('Web URL of the issue'),
      authorLogin: z.string().describe('Issue author username'),
      senderLogin: z.string().describe('User who triggered the event'),
      repositoryFullName: z.string().describe('Full repository name'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name'),
      labels: z.array(z.string()).describe('Current label names'),
      assignees: z.array(z.string()).describe('Current assignee usernames'),
      milestoneTitle: z.string().optional().describe('Milestone title if assigned'),
      commentBody: z.string().optional().describe('Comment body if this is a comment event'),
      commentId: z.number().optional().describe('Comment ID if this is a comment event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let eventType = ctx.request.headers.get('X-Gitea-Event') || '';
      let issueEventTypes = [
        'issues',
        'issue_assign',
        'issue_label',
        'issue_milestone',
        'issue_comment'
      ];

      if (!issueEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as Record<string, any>;
      let issue = data.issue as Record<string, any> | undefined;

      if (!issue) {
        return { inputs: [] };
      }

      // Skip if this is actually a pull request comment
      if (eventType === 'issue_comment' && issue.pull_request) {
        return { inputs: [] };
      }

      let action = String(data.action || 'opened');
      let labels = ((issue.labels || []) as Record<string, any>[]).map(
        (l: Record<string, any>) => String(l.name || '')
      );
      let assignees = ((issue.assignees || []) as Record<string, any>[]).map(
        (a: Record<string, any>) => String(a.login || '')
      );

      return {
        inputs: [
          {
            eventType,
            action,
            issueNumber: Number(issue.number),
            issueTitle: String(issue.title || ''),
            issueBody: String(issue.body || ''),
            issueState: String(issue.state || ''),
            issueHtmlUrl: String(issue.html_url || ''),
            authorLogin: String(issue.user?.login || ''),
            senderLogin: String(data.sender?.login || ''),
            repositoryFullName: String(data.repository?.full_name || ''),
            repositoryOwner: String(data.repository?.owner?.login || ''),
            repositoryName: String(data.repository?.name || ''),
            labels,
            assignees,
            milestoneTitle: issue.milestone ? String(issue.milestone.title) : undefined,
            commentBody: data.comment ? String(data.comment.body || '') : undefined,
            commentId: data.comment ? Number(data.comment.id) : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        issues: `issue.${ctx.input.action}`,
        issue_assign: 'issue.assigned',
        issue_label: 'issue.label_updated',
        issue_milestone: 'issue.milestoned',
        issue_comment: 'issue.commented'
      };

      let type = typeMap[ctx.input.eventType] || `issue.${ctx.input.action}`;
      let idSuffix = ctx.input.commentId ? `-comment-${ctx.input.commentId}` : '';

      return {
        type,
        id: `issue-${ctx.input.repositoryFullName}-${ctx.input.issueNumber}-${ctx.input.action}${idSuffix}-${Date.now()}`,
        output: {
          action: ctx.input.action,
          issueNumber: ctx.input.issueNumber,
          issueTitle: ctx.input.issueTitle,
          issueBody: ctx.input.issueBody,
          issueState: ctx.input.issueState,
          issueHtmlUrl: ctx.input.issueHtmlUrl,
          authorLogin: ctx.input.authorLogin,
          senderLogin: ctx.input.senderLogin,
          repositoryFullName: ctx.input.repositoryFullName,
          repositoryOwner: ctx.input.repositoryOwner,
          repositoryName: ctx.input.repositoryName,
          labels: ctx.input.labels,
          assignees: ctx.input.assignees,
          milestoneTitle: ctx.input.milestoneTitle,
          commentBody: ctx.input.commentBody,
          commentId: ctx.input.commentId
        }
      };
    }
  })
  .build();
