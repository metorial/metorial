import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubPullRequestWritesApi } from '../lib/github-pull-request-writes';
import { spec } from '../spec';

let reviewMethodSchema = z.enum([
  'create',
  'submit_pending',
  'delete_pending',
  'resolve_thread',
  'unresolve_thread',
  'add_comment_to_pending_review',
  'add_reply_to_pull_request_comment'
]);
let reviewEventSchema = z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']);
let reactionSchema = z.enum([
  '+1',
  '-1',
  'laugh',
  'confused',
  'heart',
  'hooray',
  'rocket',
  'eyes'
]);

export let reviewPullRequest = SlateTool.create(spec, {
  name: 'Review Pull Request',
  key: 'review_pull_request',
  description: `Create, submit, or delete pull request reviews; resolve or unresolve review threads; add line or file comments to a pending review; and reply or react to review comments.
Existing APPROVE, REQUEST_CHANGES, COMMENT, and request_reviewers actions remain supported.`,
  instructions: [
    'For complex reviews, use method "create" without event, add comments with method "add_comment_to_pending_review", then use method "submit_pending".',
    'Use method "resolve_thread" or "unresolve_thread" with a GraphQL threadId.',
    'Use method "add_reply_to_pull_request_comment" with commentId and at least one of body or reaction.',
    'Existing action-based calls continue to submit a review or request reviewers directly.'
  ],
  tags: { destructive: true }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z
        .number()
        .optional()
        .describe('Pull request number. Required except for review thread operations.'),
      method: reviewMethodSchema
        .optional()
        .describe('The write operation to perform on the pull request review.'),
      action: z
        .enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT', 'request_reviewers'])
        .optional()
        .describe('Existing review action or request reviewers'),
      body: z
        .string()
        .optional()
        .describe('Review comment text or the text of a reply/review comment'),
      event: reviewEventSchema.optional().describe('Review action to perform.'),
      commitID: z.string().optional().describe('SHA of commit to review'),
      threadId: z
        .string()
        .optional()
        .describe(
          'The node ID of the review thread (e.g., PRRT_kwDOxxx). Required for resolve_thread and unresolve_thread methods. Get thread IDs from pull_request_read with method get_review_comments.'
        ),
      path: z
        .string()
        .optional()
        .describe('The relative path to the file that necessitates a comment'),
      subjectType: z
        .enum(['FILE', 'LINE'])
        .optional()
        .describe('The level at which the comment is targeted'),
      line: z
        .number()
        .optional()
        .describe(
          'The line of the blob in the pull request diff that the comment applies to. For multi-line comments, the last line of the range'
        ),
      side: z
        .enum(['LEFT', 'RIGHT'])
        .optional()
        .describe(
          'The side of the diff to comment on. LEFT indicates the previous state, RIGHT indicates the new state'
        ),
      startLine: z
        .number()
        .optional()
        .describe(
          'For multi-line comments, the first line of the range that the comment applies to'
        ),
      startSide: z
        .enum(['LEFT', 'RIGHT'])
        .optional()
        .describe(
          'For multi-line comments, the starting side of the diff that the comment applies to. LEFT indicates the previous state, RIGHT indicates the new state'
        ),
      commentId: z
        .number()
        .min(1)
        .optional()
        .describe(
          'The numeric ID of the pull request review comment to reply or react to. Use the number from a #discussion_r... anchor, not the GraphQL thread node ID (PRRT_...).'
        ),
      reaction: reactionSchema
        .optional()
        .describe('Emoji reaction to add. Required unless body is provided.'),
      comments: z
        .array(
          z.object({
            path: z.string().describe('File path relative to repo root'),
            position: z.number().optional().describe('Position in the diff'),
            body: z.string().describe('Comment body')
          })
        )
        .optional()
        .describe('Inline review comments for an existing action-based review call'),
      reviewers: z
        .array(z.string())
        .optional()
        .describe('Usernames to request review from for request_reviewers'),
      teamReviewers: z
        .array(z.string())
        .optional()
        .describe('Team slugs to request review from for request_reviewers')
    })
  )
  .output(
    z.object({
      operation: z.string().optional().describe('Review operation performed'),
      reviewId: z.union([z.string(), z.number()]).optional().describe('Review ID'),
      threadId: z.string().optional().describe('Review thread node ID'),
      state: z.string().optional().describe('Review or thread state'),
      htmlUrl: z.string().optional().describe('URL to the review'),
      requestedReviewers: z
        .array(z.string())
        .optional()
        .describe('Requested reviewer usernames'),
      result: z.record(z.string(), z.any()).optional().describe('Provider response details')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    if (input.method && input.action) {
      throw createApiServiceError('Provide either method or action, not both.', {
        reason: 'github_pull_request_review_operation_conflict'
      });
    }
    if (!input.method && !input.action) {
      throw createApiServiceError('Either method or action is required.', {
        reason: 'github_pull_request_review_operation_required'
      });
    }

    let api = new GitHubPullRequestWritesApi(ctx.auth);
    if (input.action === 'request_reviewers') {
      if (!Number.isSafeInteger(input.pullNumber)) {
        throw createApiServiceError('pullNumber is required for request_reviewers.', {
          reason: 'github_pull_request_review_number_required'
        });
      }
      if ((input.reviewers?.length ?? 0) + (input.teamReviewers?.length ?? 0) === 0) {
        throw createApiServiceError(
          'At least one reviewer or teamReviewers entry is required.',
          { reason: 'github_pull_request_reviewers_required' }
        );
      }
      let response = await api.requestReviewers(
        input.owner,
        input.repo,
        input.pullNumber as number,
        input.reviewers ?? [],
        input.teamReviewers ?? []
      );
      let requested = (response.requested_reviewers ?? []).map(
        (reviewer: Record<string, any>) => reviewer.login
      );
      return {
        output: {
          operation: 'request_reviewers',
          requestedReviewers: requested,
          result: response
        },
        message: `Requested reviews on PR **#${input.pullNumber}**.`
      };
    }

    if (input.action) {
      if (!Number.isSafeInteger(input.pullNumber)) {
        throw createApiServiceError('pullNumber is required for review actions.', {
          reason: 'github_pull_request_review_number_required'
        });
      }
      let review = await api.createActionReview({
        owner: input.owner,
        repo: input.repo,
        pullNumber: input.pullNumber as number,
        body: input.body,
        event: input.action,
        comments: input.comments
      });
      return {
        output: {
          operation: 'create',
          reviewId: review.id,
          state: review.state,
          htmlUrl: review.url ?? review.html_url,
          result: review
        },
        message: `Submitted a **${input.action}** review on PR **#${input.pullNumber}**.`
      };
    }

    let method = input.method as z.infer<typeof reviewMethodSchema>;
    let requirePullNumber = () => {
      if (!Number.isSafeInteger(input.pullNumber) || (input.pullNumber ?? 0) < 1) {
        throw createApiServiceError(`pullNumber is required for ${method}.`, {
          reason: 'github_pull_request_review_number_required'
        });
      }
      return input.pullNumber as number;
    };

    switch (method) {
      case 'create': {
        let review = await api.createReview({
          owner: input.owner,
          repo: input.repo,
          pullNumber: requirePullNumber(),
          body: input.body,
          event: input.event,
          commitID: input.commitID
        });
        return {
          output: {
            operation: method,
            reviewId: review.id,
            state: review.state ?? (input.event ? 'SUBMITTED' : 'PENDING'),
            htmlUrl: review.url,
            result: review
          },
          message: input.event
            ? `Submitted a **${input.event}** review on PR **#${input.pullNumber}**.`
            : `Created a pending review on PR **#${input.pullNumber}**.`
        };
      }
      case 'submit_pending': {
        if (!input.event) {
          throw createApiServiceError('event is required for submit_pending.', {
            reason: 'github_submit_pending_review_event_required'
          });
        }
        let review = await api.submitPendingReview({
          owner: input.owner,
          repo: input.repo,
          pullNumber: requirePullNumber(),
          body: input.body,
          event: input.event
        });
        return {
          output: {
            operation: method,
            reviewId: review.id,
            state: review.state,
            htmlUrl: review.url,
            result: review
          },
          message: `Submitted the pending review on PR **#${input.pullNumber}**.`
        };
      }
      case 'delete_pending': {
        let result = await api.deletePendingReview(
          input.owner,
          input.repo,
          requirePullNumber()
        );
        return {
          output: {
            operation: method,
            reviewId: result.reviewId,
            state: 'DELETED',
            result
          },
          message: `Deleted the pending review on PR **#${input.pullNumber}**.`
        };
      }
      case 'resolve_thread':
      case 'unresolve_thread': {
        if (!input.threadId) {
          throw createApiServiceError(`threadId is required for ${method}.`, {
            reason: 'github_pull_request_review_thread_id_required'
          });
        }
        let thread = await api.setThreadResolved(input.threadId, method === 'resolve_thread');
        return {
          output: {
            operation: method,
            threadId: thread.id,
            state: thread.isResolved ? 'RESOLVED' : 'UNRESOLVED',
            result: thread
          },
          message:
            method === 'resolve_thread'
              ? 'Resolved the pull request review thread.'
              : 'Unresolved the pull request review thread.'
        };
      }
      case 'add_comment_to_pending_review': {
        let missing = [
          !input.path && 'path',
          !input.body && 'body',
          !input.subjectType && 'subjectType'
        ].filter(Boolean);
        if (missing.length > 0) {
          throw createApiServiceError(
            `${missing.join(', ')} required for add_comment_to_pending_review.`,
            { reason: 'github_pending_review_comment_fields_required' }
          );
        }
        let hasRangeStart = input.startLine !== undefined || input.startSide !== undefined;
        if (input.subjectType === 'FILE') {
          if (
            input.line !== undefined ||
            input.side !== undefined ||
            input.startLine !== undefined ||
            input.startSide !== undefined
          ) {
            throw createApiServiceError(
              'FILE comments must omit line, side, startLine, and startSide.',
              { reason: 'github_pending_review_file_comment_location_invalid' }
            );
          }
        } else {
          if (!Number.isSafeInteger(input.line) || (input.line ?? 0) < 1 || !input.side) {
            throw createApiServiceError(
              'LINE comments require a positive integer line and side.',
              { reason: 'github_pending_review_line_comment_location_required' }
            );
          }
          if (
            hasRangeStart &&
            (!Number.isSafeInteger(input.startLine) ||
              (input.startLine ?? 0) < 1 ||
              !input.startSide)
          ) {
            throw createApiServiceError(
              'Multi-line comments require both a positive startLine and startSide.',
              { reason: 'github_pending_review_comment_range_incomplete' }
            );
          }
          if (
            input.startLine !== undefined &&
            input.line !== undefined &&
            input.startLine >= input.line
          ) {
            throw createApiServiceError('startLine must be less than line.', {
              reason: 'github_pending_review_comment_range_invalid'
            });
          }
          if (
            input.startSide !== undefined &&
            input.side !== undefined &&
            input.startSide !== input.side
          ) {
            throw createApiServiceError(
              'startSide must match side for a multi-line comment.',
              {
                reason: 'github_pending_review_comment_sides_mismatch'
              }
            );
          }
        }
        let thread = await api.addPendingReviewComment({
          owner: input.owner,
          repo: input.repo,
          pullNumber: requirePullNumber(),
          path: input.path as string,
          body: input.body as string,
          subjectType: input.subjectType as 'FILE' | 'LINE',
          line: input.line,
          side: input.side,
          startLine: input.startLine,
          startSide: input.startSide
        });
        return {
          output: {
            operation: method,
            threadId: thread.id,
            state: thread.isResolved ? 'RESOLVED' : 'UNRESOLVED',
            result: thread
          },
          message: `Added a review comment to the pending review on PR **#${input.pullNumber}**.`
        };
      }
      default: {
        if (!Number.isSafeInteger(input.commentId) || (input.commentId ?? 0) < 1) {
          throw createApiServiceError(
            'commentId must be greater than 0 for add_reply_to_pull_request_comment.',
            { reason: 'github_pull_request_review_comment_id_required' }
          );
        }
        if (input.body === undefined && input.reaction === undefined) {
          throw createApiServiceError('At least one of body or reaction is required.', {
            reason: 'github_pull_request_review_reply_content_required'
          });
        }
        if (input.body !== undefined && input.body.length === 0) {
          throw createApiServiceError('body cannot be empty when provided.', {
            reason: 'github_pull_request_review_reply_body_empty'
          });
        }
        let pullNumber = input.body !== undefined ? requirePullNumber() : input.pullNumber;
        let result = await api.addReplyOrReaction({
          owner: input.owner,
          repo: input.repo,
          pullNumber,
          commentId: input.commentId as number,
          body: input.body,
          reaction: input.reaction
        });
        return {
          output: {
            operation: method,
            result
          },
          message:
            input.body !== undefined && input.reaction !== undefined
              ? 'Added the reply and reaction to the pull request review comment.'
              : input.body !== undefined
                ? 'Added the reply to the pull request review comment.'
                : 'Added the reaction to the pull request review comment.'
        };
      }
    }
  })
  .build();
