import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  GitHubIssuesLabelsClient,
  requirePositiveInteger,
  resolveIssueNumber
} from '../lib/github-issues-labels';
import { spec } from '../spec';

const reactionSchema = z.enum([
  '+1',
  '-1',
  'laugh',
  'confused',
  'heart',
  'hooray',
  'rocket',
  'eyes'
]);

export let commentOnIssue = SlateTool.create(spec, {
  name: 'Comment on Issue',
  key: 'comment_on_issue',
  description:
    'Add a comment and/or reaction to a GitHub issue or pull request. Reactions can target the issue or pull request itself, or a specific issue comment; use the review-comment tools for pull request review comments.'
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      issueNumber: z
        .number()
        .optional()
        .describe('Issue or pull request number (legacy field)'),
      issue_number: z
        .number()
        .optional()
        .describe('Issue or pull request number to comment on or react to'),
      comment_id: z
        .number()
        .min(1)
        .optional()
        .describe(
          'Numeric issue comment ID to react to; omit to react to the issue or pull request itself. Cannot be combined with body.'
        ),
      body: z
        .string()
        .optional()
        .describe('Comment content; required unless reaction is provided'),
      reaction: reactionSchema
        .optional()
        .describe('Emoji reaction to add; required unless body is provided')
    })
  )
  .output(
    z.object({
      commentId: z.number().optional().describe('Unique created comment ID'),
      htmlUrl: z.string().optional().describe('URL to the created comment on GitHub'),
      author: z.string().optional().describe('Created comment author login'),
      createdAt: z.string().optional().describe('Created comment timestamp'),
      comment: z
        .object({
          commentId: z.number(),
          htmlUrl: z.string(),
          author: z.string(),
          createdAt: z.string()
        })
        .optional(),
      reaction: z
        .object({
          reactionId: z.number(),
          apiUrl: z.string(),
          content: reactionSchema,
          target: z.enum(['issue', 'comment']),
          author: z.string().nullable(),
          createdAt: z.string().nullable()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const issueNumber = resolveIssueNumber(ctx.input.issueNumber, ctx.input.issue_number);
    if (issueNumber === undefined) {
      throw createApiServiceError('issue_number is required.', {
        reason: 'github_issue_comment_number_required'
      });
    }
    requirePositiveInteger(issueNumber, 'issue_number');
    if (ctx.input.comment_id !== undefined) {
      requirePositiveInteger(ctx.input.comment_id, 'comment_id');
    }

    const hasBody = ctx.input.body !== undefined;
    const hasReaction = ctx.input.reaction !== undefined;
    if (!hasBody && !hasReaction) {
      throw createApiServiceError('At least one of body or reaction is required.', {
        reason: 'github_issue_comment_content_required'
      });
    }
    if (hasBody && ctx.input.body === '') {
      throw createApiServiceError('body cannot be empty when provided.', {
        reason: 'github_issue_comment_body_empty'
      });
    }
    if (ctx.input.comment_id !== undefined && hasBody) {
      throw createApiServiceError('comment_id cannot be combined with body.', {
        reason: 'github_issue_comment_body_target_conflict'
      });
    }
    if (ctx.input.comment_id !== undefined && !hasReaction) {
      throw createApiServiceError(
        'comment_id can only be provided when reaction is provided.',
        { reason: 'github_issue_comment_reaction_required' }
      );
    }

    const client = new GitHubIssuesLabelsClient(ctx.auth);
    let reaction:
      | {
          reactionId: number;
          apiUrl: string;
          content: z.infer<typeof reactionSchema>;
          target: 'comment' | 'issue';
          author: string | null;
          createdAt: string | null;
        }
      | undefined;

    if (ctx.input.reaction) {
      if (ctx.input.comment_id !== undefined) {
        const targetComment = await client.getIssueComment(
          ctx.input.owner,
          ctx.input.repo,
          ctx.input.comment_id
        );
        client.assertCommentBelongsToIssue(targetComment, issueNumber);
        const value = await client.addIssueCommentReaction(
          ctx.input.owner,
          ctx.input.repo,
          ctx.input.comment_id,
          ctx.input.reaction
        );
        reaction = {
          reactionId: value.id,
          apiUrl: client.getIssueCommentReactionApiUrl(
            ctx.input.owner,
            ctx.input.repo,
            ctx.input.comment_id,
            value.id
          ),
          content: ctx.input.reaction,
          target: 'comment',
          author: value.user?.login ?? null,
          createdAt: value.created_at ?? null
        };
      } else {
        const value = await client.addIssueReaction(
          ctx.input.owner,
          ctx.input.repo,
          issueNumber,
          ctx.input.reaction
        );
        reaction = {
          reactionId: value.id,
          apiUrl: client.getIssueReactionApiUrl(
            ctx.input.owner,
            ctx.input.repo,
            issueNumber,
            value.id
          ),
          content: ctx.input.reaction,
          target: 'issue',
          author: value.user?.login ?? null,
          createdAt: value.created_at ?? null
        };
      }
    }

    const createdComment = ctx.input.body
      ? await client.createIssueComment(
          ctx.input.owner,
          ctx.input.repo,
          issueNumber,
          ctx.input.body
        )
      : undefined;
    const comment = createdComment
      ? {
          commentId: createdComment.id,
          htmlUrl: createdComment.html_url,
          author: createdComment.user.login,
          createdAt: createdComment.created_at
        }
      : undefined;

    return {
      output: {
        ...(comment
          ? {
              commentId: comment.commentId,
              htmlUrl: comment.htmlUrl,
              author: comment.author,
              createdAt: comment.createdAt,
              comment
            }
          : {}),
        ...(reaction ? { reaction } : {})
      },
      message:
        comment && reaction
          ? `Added a comment and reaction on **#${issueNumber}** in **${ctx.input.owner}/${ctx.input.repo}**.`
          : comment
            ? `Added comment on **#${issueNumber}** in **${ctx.input.owner}/${ctx.input.repo}** — ${comment.htmlUrl}`
            : `Added reaction to **#${issueNumber}** in **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
