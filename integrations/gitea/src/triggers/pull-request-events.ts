import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let pullRequestEvents = SlateTrigger.create(spec, {
  name: 'Pull Request Events',
  key: 'pull_request_events',
  description:
    'Triggers on pull request events including creation, updates, merges, assignment changes, label changes, comments, reviews, and sync events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Gitea event header value'),
      action: z
        .string()
        .describe('Sub-action (opened, edited, closed, merged, synchronized, etc.)'),
      prNumber: z.number().describe('Pull request number'),
      prTitle: z.string().describe('Pull request title'),
      prBody: z.string().describe('Pull request body'),
      prState: z.string().describe('Pull request state'),
      prHtmlUrl: z.string().describe('Pull request URL'),
      headBranch: z.string().describe('Source branch'),
      baseBranch: z.string().describe('Target branch'),
      isMerged: z.boolean().describe('Whether the PR is merged'),
      authorLogin: z.string().describe('PR author'),
      senderLogin: z.string().describe('User who triggered the event'),
      repositoryFullName: z.string().describe('Full repository name'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name'),
      labels: z.array(z.string()).describe('Current label names'),
      assignees: z.array(z.string()).describe('Current assignee usernames'),
      reviewState: z.string().optional().describe('Review state if this is a review event'),
      reviewBody: z.string().optional().describe('Review body if this is a review event'),
      commentBody: z.string().optional().describe('Comment body if this is a comment event'),
      commentId: z.number().optional().describe('Comment ID if this is a comment event')
    })
  )
  .output(
    z.object({
      action: z
        .string()
        .describe(
          'Event action (opened, edited, closed, merged, synchronized, assigned, label_updated, commented, reviewed)'
        ),
      prNumber: z.number().describe('Pull request number'),
      prTitle: z.string().describe('Pull request title'),
      prBody: z.string().describe('Pull request body'),
      prState: z.string().describe('Pull request state'),
      prHtmlUrl: z.string().describe('Web URL of the pull request'),
      headBranch: z.string().describe('Source branch'),
      baseBranch: z.string().describe('Target branch'),
      isMerged: z.boolean().describe('Whether the PR has been merged'),
      authorLogin: z.string().describe('PR author username'),
      senderLogin: z.string().describe('User who triggered the event'),
      repositoryFullName: z.string().describe('Full repository name'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name'),
      labels: z.array(z.string()).describe('Current label names'),
      assignees: z.array(z.string()).describe('Current assignee usernames'),
      reviewState: z
        .string()
        .optional()
        .describe('Review state (APPROVED, CHANGES_REQUESTED, etc.)'),
      reviewBody: z.string().optional().describe('Review body'),
      commentBody: z.string().optional().describe('Comment body'),
      commentId: z.number().optional().describe('Comment ID')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let eventType = ctx.request.headers.get('X-Gitea-Event') || '';
      let prEventTypes = [
        'pull_request',
        'pull_request_assign',
        'pull_request_label',
        'pull_request_milestone',
        'pull_request_comment',
        'pull_request_review',
        'pull_request_sync'
      ];

      if (!prEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as Record<string, any>;
      let pr = data.pull_request as Record<string, any> | undefined;

      if (!pr) {
        return { inputs: [] };
      }

      let action = String(data.action || 'opened');
      let labels = ((pr.labels || []) as Record<string, any>[]).map((l: Record<string, any>) =>
        String(l.name || '')
      );
      let assignees = ((pr.assignees || []) as Record<string, any>[]).map(
        (a: Record<string, any>) => String(a.login || '')
      );

      return {
        inputs: [
          {
            eventType,
            action,
            prNumber: Number(pr.number),
            prTitle: String(pr.title || ''),
            prBody: String(pr.body || ''),
            prState: String(pr.state || ''),
            prHtmlUrl: String(pr.html_url || ''),
            headBranch: String(pr.head?.ref || ''),
            baseBranch: String(pr.base?.ref || ''),
            isMerged: Boolean(pr.merged),
            authorLogin: String(pr.user?.login || ''),
            senderLogin: String(data.sender?.login || ''),
            repositoryFullName: String(data.repository?.full_name || ''),
            repositoryOwner: String(data.repository?.owner?.login || ''),
            repositoryName: String(data.repository?.name || ''),
            labels,
            assignees,
            reviewState: data.review ? String(data.review.state || '') : undefined,
            reviewBody: data.review ? String(data.review.body || '') : undefined,
            commentBody: data.comment ? String(data.comment.body || '') : undefined,
            commentId: data.comment ? Number(data.comment.id) : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        pull_request: `pull_request.${ctx.input.action}`,
        pull_request_assign: 'pull_request.assigned',
        pull_request_label: 'pull_request.label_updated',
        pull_request_milestone: 'pull_request.milestoned',
        pull_request_comment: 'pull_request.commented',
        pull_request_review: 'pull_request.reviewed',
        pull_request_sync: 'pull_request.synchronized'
      };

      let type = typeMap[ctx.input.eventType] || `pull_request.${ctx.input.action}`;
      let idSuffix = ctx.input.commentId ? `-comment-${ctx.input.commentId}` : '';

      return {
        type,
        id: `pr-${ctx.input.repositoryFullName}-${ctx.input.prNumber}-${ctx.input.eventType}-${ctx.input.action}${idSuffix}-${Date.now()}`,
        output: {
          action: ctx.input.action,
          prNumber: ctx.input.prNumber,
          prTitle: ctx.input.prTitle,
          prBody: ctx.input.prBody,
          prState: ctx.input.prState,
          prHtmlUrl: ctx.input.prHtmlUrl,
          headBranch: ctx.input.headBranch,
          baseBranch: ctx.input.baseBranch,
          isMerged: ctx.input.isMerged,
          authorLogin: ctx.input.authorLogin,
          senderLogin: ctx.input.senderLogin,
          repositoryFullName: ctx.input.repositoryFullName,
          repositoryOwner: ctx.input.repositoryOwner,
          repositoryName: ctx.input.repositoryName,
          labels: ctx.input.labels,
          assignees: ctx.input.assignees,
          reviewState: ctx.input.reviewState,
          reviewBody: ctx.input.reviewBody,
          commentBody: ctx.input.commentBody,
          commentId: ctx.input.commentId
        }
      };
    }
  })
  .build();
