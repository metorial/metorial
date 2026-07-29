import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  createGitHubReadClient,
  getRestPageMetadata,
  githubReadApiError,
  invalidGitHubReadInput,
  mapGitHubLabel
} from './read-shared';

let pullRequestReadMethodSchema = z.enum([
  'get',
  'get_diff',
  'get_status',
  'get_files',
  'get_commits',
  'get_review_comments',
  'get_reviews',
  'get_comments',
  'get_check_runs'
]);

let pageInfoSchema = z.object({
  hasNextPage: z.boolean().describe('Whether another cursor page is available'),
  hasPreviousPage: z.boolean().describe('Whether a previous cursor page is available'),
  startCursor: z.string().nullable().describe('Cursor for the first returned item'),
  endCursor: z.string().nullable().describe('Cursor to pass as after for the next page')
});

let conversationCommentSchema = z.object({
  commentId: z.number().describe('Numeric comment ID'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  body: z.string().nullable().describe('Comment body in Markdown'),
  author: z.string().nullable().describe('Comment author login'),
  authorAssociation: z.string().optional().describe('Author relationship to the repository'),
  htmlUrl: z.string().describe('URL to the comment on GitHub'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

let pullRequestSchema = z.object({
  pullRequestId: z.number().describe('Numeric pull request ID'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  pullNumber: z.number().describe('Pull request number'),
  title: z.string().describe('Pull request title'),
  body: z.string().nullable().describe('Pull request body in Markdown'),
  state: z.string().describe('Pull request state'),
  draft: z.boolean().describe('Whether the pull request is a draft'),
  locked: z.boolean().describe('Whether the pull request is locked'),
  htmlUrl: z.string().describe('URL to the pull request on GitHub'),
  author: z.string().nullable().describe('Pull request author login'),
  authorAssociation: z.string().optional().describe('Author relationship to the repository'),
  headRef: z.string().describe('Head branch name'),
  headSha: z.string().describe('Head commit SHA'),
  headRepository: z.string().nullable().describe('Head repository in owner/name form'),
  baseRef: z.string().describe('Base branch name'),
  baseSha: z.string().describe('Base commit SHA'),
  baseRepository: z.string().nullable().describe('Base repository in owner/name form'),
  mergeCommitSha: z.string().nullable().describe('Merge commit SHA when available'),
  mergeable: z
    .boolean()
    .nullable()
    .describe('Whether GitHub considers the pull request mergeable'),
  mergeableState: z.string().describe('Detailed mergeability state'),
  merged: z.boolean().describe('Whether the pull request has been merged'),
  mergedAt: z.string().nullable().describe('Merge timestamp'),
  mergedBy: z.string().nullable().describe('Login of the user who merged the pull request'),
  additions: z.number().describe('Lines added'),
  deletions: z.number().describe('Lines deleted'),
  changedFiles: z.number().describe('Number of changed files'),
  commitsCount: z.number().describe('Number of commits'),
  commentsCount: z.number().describe('Number of conversation comments'),
  reviewCommentsCount: z.number().describe('Number of review comments'),
  labels: z.array(
    z.object({
      labelId: z.number(),
      nodeId: z.string().optional(),
      name: z.string(),
      color: z.string(),
      description: z.string().nullable(),
      isDefault: z.boolean(),
      apiUrl: z.string().optional()
    })
  ),
  requestedReviewers: z.array(z.string()).describe('Requested reviewer usernames'),
  requestedTeams: z.array(z.string()).describe('Requested reviewer team slugs'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  closedAt: z.string().nullable().describe('Closure timestamp')
});

let fileSchema = z.object({
  sha: z.string().describe('Blob SHA'),
  path: z.string().describe('File path'),
  status: z.string().describe('Change status'),
  additions: z.number().describe('Lines added'),
  deletions: z.number().describe('Lines deleted'),
  changes: z.number().describe('Total changed lines'),
  previousPath: z.string().optional().describe('Previous path when renamed'),
  blobUrl: z.string().describe('URL to the blob on GitHub'),
  rawUrl: z.string().describe('URL to the raw file'),
  contentsUrl: z.string().describe('GitHub API contents URL'),
  patch: z.string().nullable().describe('Unified patch when GitHub provides it')
});

let commitSchema = z.object({
  sha: z.string().describe('Commit SHA'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  htmlUrl: z.string().describe('URL to the commit on GitHub'),
  message: z.string().describe('Commit message'),
  authorName: z.string().nullable().describe('Commit author name'),
  authorEmail: z.string().nullable().describe('Commit author email'),
  authoredAt: z.string().nullable().describe('Commit author timestamp'),
  authorLogin: z.string().nullable().describe('GitHub login linked to the author'),
  committerLogin: z.string().nullable().describe('GitHub login linked to the committer')
});

let reviewThreadSchema = z.object({
  threadId: z.string().describe('GraphQL review thread ID'),
  isResolved: z.boolean().describe('Whether the thread is resolved'),
  isOutdated: z.boolean().describe('Whether the code location is outdated'),
  isCollapsed: z.boolean().describe('Whether GitHub collapses the thread'),
  totalComments: z.number().describe('Number of comments in the thread'),
  comments: z.array(
    z.object({
      commentId: z.string().describe('GraphQL review comment ID'),
      body: z.string().describe('Review comment body'),
      path: z.string().describe('Reviewed file path'),
      line: z.number().nullable().describe('Reviewed line number'),
      author: z.string().nullable().describe('Comment author login'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      htmlUrl: z.string().describe('URL to the review comment')
    })
  )
});

let reviewSchema = z.object({
  reviewId: z.number().describe('Numeric review ID'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  state: z.string().describe('Review state'),
  body: z.string().nullable().describe('Review body'),
  author: z.string().nullable().describe('Reviewer login'),
  authorAssociation: z.string().optional().describe('Reviewer relationship to the repository'),
  commitId: z.string().nullable().describe('Reviewed commit SHA'),
  htmlUrl: z.string().describe('URL to the review'),
  submittedAt: z.string().nullable().describe('Review submission timestamp')
});

let commitStatusSchema = z.object({
  statusId: z.number().describe('Numeric status ID'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  state: z.string().describe('Status state'),
  context: z.string().describe('Status context'),
  description: z.string().nullable().describe('Status description'),
  targetUrl: z.string().nullable().describe('Linked target URL'),
  creator: z.string().nullable().describe('Status creator login'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

let checkRunSchema = z.object({
  checkRunId: z.number().describe('Numeric check run ID'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  name: z.string().describe('Check run name'),
  status: z.string().describe('Check run status'),
  conclusion: z.string().nullable().describe('Check run conclusion'),
  headSha: z.string().describe('Checked commit SHA'),
  detailsUrl: z.string().nullable().describe('External details URL'),
  htmlUrl: z.string().nullable().describe('URL to the check run on GitHub'),
  startedAt: z.string().nullable().describe('Start timestamp'),
  completedAt: z.string().nullable().describe('Completion timestamp'),
  appName: z.string().nullable().describe('GitHub App that created the check')
});

let mapConversationComment = (comment: any) => ({
  commentId: comment.id,
  nodeId: comment.node_id,
  body: comment.body ?? null,
  author: comment.user?.login ?? null,
  authorAssociation: comment.author_association,
  htmlUrl: comment.html_url,
  createdAt: comment.created_at,
  updatedAt: comment.updated_at
});

let pagedMethods = new Set([
  'get_files',
  'get_commits',
  'get_review_comments',
  'get_reviews',
  'get_comments',
  'get_check_runs'
]);

export let pullRequestRead = SlateTool.create(spec, {
  name: 'Pull Request Read',
  key: 'pull_request_read',
  description:
    'Read details, a downloadable diff, commit status, changed files, commits, review threads, reviews, conversation comments, or check runs for one GitHub pull request.',
  instructions: [
    'Use method "get_review_comments" for code-review threads and "get_comments" for the pull request conversation.',
    'Use method "get_status" for legacy commit statuses and "get_check_runs" for individual checks.',
    'Use after only with "get_review_comments"; use page with the other paginated methods.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      method: pullRequestReadMethodSchema.describe('Read operation to perform'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      page: z.number().min(1).optional().describe('REST page number'),
      perPage: z.number().min(1).max(100).optional().describe('Results per page'),
      after: z.string().optional().describe('Cursor used only by get_review_comments')
    })
  )
  .output(
    z.object({
      method: pullRequestReadMethodSchema.describe('Read operation performed'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      htmlUrl: z.string().describe('URL to the pull request on GitHub'),
      headSha: z.string().optional().describe('Pull request head commit SHA'),
      pullRequest: pullRequestSchema.optional().describe('Pull request details'),
      diffFileName: z.string().optional().describe('Name of the downloadable diff file'),
      diffByteSize: z.number().optional().describe('UTF-8 size of the diff'),
      status: z
        .object({
          state: z.string().describe('Combined commit status'),
          sha: z.string().describe('Head commit SHA'),
          totalCount: z.number().describe('Number of legacy statuses'),
          statuses: z.array(commitStatusSchema)
        })
        .optional()
        .describe('Combined legacy commit status'),
      files: z.array(fileSchema).optional().describe('Changed files'),
      commits: z.array(commitSchema).optional().describe('Pull request commits'),
      reviewThreads: z.array(reviewThreadSchema).optional().describe('Code-review threads'),
      reviews: z.array(reviewSchema).optional().describe('Pull request reviews'),
      comments: z
        .array(conversationCommentSchema)
        .optional()
        .describe('Pull request conversation comments'),
      checkRuns: z.array(checkRunSchema).optional().describe('Check runs for the head commit'),
      totalCount: z.number().optional().describe('Provider-reported total count'),
      returnedCount: z.number().optional().describe('Number of items returned on this page'),
      page: z.number().optional().describe('Current REST page number'),
      perPage: z.number().optional().describe('Requested results per page'),
      pageInfo: pageInfoSchema.optional().describe('Cursor pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let { method, owner, repo, pullNumber, page, perPage, after } = ctx.input;

    if (after !== undefined && method !== 'get_review_comments') {
      throw invalidGitHubReadInput(
        `after is only supported for "get_review_comments", not "${method}".`
      );
    }
    if (method === 'get_review_comments' && page !== undefined) {
      throw invalidGitHubReadInput(
        'page cannot be used with "get_review_comments"; pass its pageInfo.endCursor as after.'
      );
    }
    if (!pagedMethods.has(method) && (page !== undefined || perPage !== undefined)) {
      throw invalidGitHubReadInput(`page and perPage are not supported for "${method}".`);
    }

    let client = createGitHubReadClient(ctx.auth);
    let htmlUrl = `${client.getRepositoryHtmlUrl(owner, repo)}/pull/${pullNumber}`;

    try {
      if (method === 'get') {
        let pullRequest = await client.getPullRequest(owner, repo, pullNumber);
        let mapped = {
          pullRequestId: pullRequest.id,
          nodeId: pullRequest.node_id,
          pullNumber: pullRequest.number,
          title: pullRequest.title,
          body: pullRequest.body ?? null,
          state: pullRequest.state,
          draft: pullRequest.draft ?? false,
          locked: pullRequest.locked ?? false,
          htmlUrl: pullRequest.html_url,
          author: pullRequest.user?.login ?? null,
          authorAssociation: pullRequest.author_association,
          headRef: pullRequest.head.ref,
          headSha: pullRequest.head.sha,
          headRepository: pullRequest.head.repo?.full_name ?? null,
          baseRef: pullRequest.base.ref,
          baseSha: pullRequest.base.sha,
          baseRepository: pullRequest.base.repo?.full_name ?? null,
          mergeCommitSha: pullRequest.merge_commit_sha ?? null,
          mergeable: pullRequest.mergeable ?? null,
          mergeableState: pullRequest.mergeable_state,
          merged: pullRequest.merged ?? false,
          mergedAt: pullRequest.merged_at ?? null,
          mergedBy: pullRequest.merged_by?.login ?? null,
          additions: pullRequest.additions,
          deletions: pullRequest.deletions,
          changedFiles: pullRequest.changed_files,
          commitsCount: pullRequest.commits,
          commentsCount: pullRequest.comments,
          reviewCommentsCount: pullRequest.review_comments,
          labels: (pullRequest.labels ?? []).map(mapGitHubLabel),
          requestedReviewers: (pullRequest.requested_reviewers ?? []).map(
            (reviewer: any) => reviewer.login
          ),
          requestedTeams: (pullRequest.requested_teams ?? []).map((team: any) => team.slug),
          createdAt: pullRequest.created_at,
          updatedAt: pullRequest.updated_at,
          closedAt: pullRequest.closed_at ?? null
        };
        return {
          output: {
            method,
            owner,
            repo,
            pullNumber,
            htmlUrl: mapped.htmlUrl,
            headSha: mapped.headSha,
            pullRequest: mapped
          },
          message: `Read pull request **#${pullNumber}** in **${owner}/${repo}**.`
        };
      }

      if (method === 'get_diff') {
        let diff = await client.getPullRequestDiff(owner, repo, pullNumber);
        let diffFileName = `${owner}-${repo}-pull-${pullNumber}.diff`;
        let diffByteSize = Buffer.byteLength(diff, 'utf8');
        return {
          output: { method, owner, repo, pullNumber, htmlUrl, diffFileName, diffByteSize },
          message: `Downloaded the diff for pull request **#${pullNumber}** (${diffByteSize} bytes).`,
          attachments: [createTextAttachment(diff, 'text/x-diff')]
        };
      }

      if (method === 'get_status') {
        let pullRequest = await client.getPullRequest(owner, repo, pullNumber);
        let headSha = pullRequest.head.sha;
        let combined = await client.getCombinedStatus(owner, repo, headSha);
        let statuses = (combined.statuses ?? []).map((status: any) => ({
          statusId: status.id,
          nodeId: status.node_id,
          state: status.state,
          context: status.context,
          description: status.description ?? null,
          targetUrl: status.target_url ?? null,
          creator: status.creator?.login ?? null,
          createdAt: status.created_at,
          updatedAt: status.updated_at
        }));
        return {
          output: {
            method,
            owner,
            repo,
            pullNumber,
            htmlUrl,
            headSha,
            status: {
              state: combined.state,
              sha: combined.sha ?? headSha,
              totalCount: combined.total_count ?? statuses.length,
              statuses
            }
          },
          message: `Combined commit status for pull request **#${pullNumber}** is **${combined.state}**.`
        };
      }

      if (method === 'get_files') {
        let files = (
          await client.listPullRequestFiles(owner, repo, pullNumber, { page, perPage })
        ).map((file: any) => ({
          sha: file.sha,
          path: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          previousPath: file.previous_filename,
          blobUrl: file.blob_url,
          rawUrl: file.raw_url,
          contentsUrl: file.contents_url,
          patch: file.patch ?? null
        }));
        return {
          output: {
            method,
            owner,
            repo,
            pullNumber,
            htmlUrl,
            files,
            ...getRestPageMetadata(files.length, { page, perPage })
          },
          message: `Found **${files.length}** changed files on pull request **#${pullNumber}**.`
        };
      }

      if (method === 'get_commits') {
        let commits = (
          await client.listPullRequestCommits(owner, repo, pullNumber, { page, perPage })
        ).map((commit: any) => ({
          sha: commit.sha,
          nodeId: commit.node_id,
          htmlUrl: commit.html_url,
          message: commit.commit.message,
          authorName: commit.commit.author?.name ?? null,
          authorEmail: commit.commit.author?.email ?? null,
          authoredAt: commit.commit.author?.date ?? null,
          authorLogin: commit.author?.login ?? null,
          committerLogin: commit.committer?.login ?? null
        }));
        return {
          output: {
            method,
            owner,
            repo,
            pullNumber,
            htmlUrl,
            commits,
            ...getRestPageMetadata(commits.length, { page, perPage })
          },
          message: `Found **${commits.length}** commits on pull request **#${pullNumber}**.`
        };
      }

      if (method === 'get_review_comments') {
        let result = await client.listPullRequestReviewThreads(owner, repo, pullNumber, {
          perPage,
          after
        });
        let reviewThreads = result.nodes.map(thread => ({
          threadId: String(thread.id),
          isResolved: thread.isResolved,
          isOutdated: thread.isOutdated,
          isCollapsed: thread.isCollapsed,
          totalComments: thread.comments.totalCount,
          comments: thread.comments.nodes.map(comment => ({
            commentId: String(comment.id),
            body: comment.body,
            path: comment.path,
            line: comment.line,
            author: comment.author?.login ?? null,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
            htmlUrl: comment.url
          }))
        }));
        return {
          output: {
            method,
            owner,
            repo,
            pullNumber,
            htmlUrl,
            reviewThreads,
            totalCount: result.totalCount,
            returnedCount: reviewThreads.length,
            perPage: perPage ?? 30,
            pageInfo: result.pageInfo
          },
          message: `Found **${reviewThreads.length}** review threads on pull request **#${pullNumber}**.`
        };
      }

      if (method === 'get_reviews') {
        let reviews = (
          await client.listPullRequestReviews(owner, repo, pullNumber, { page, perPage })
        ).map((review: any) => ({
          reviewId: review.id,
          nodeId: review.node_id,
          state: review.state,
          body: review.body ?? null,
          author: review.user?.login ?? null,
          authorAssociation: review.author_association,
          commitId: review.commit_id ?? null,
          htmlUrl: review.html_url,
          submittedAt: review.submitted_at ?? null
        }));
        return {
          output: {
            method,
            owner,
            repo,
            pullNumber,
            htmlUrl,
            reviews,
            ...getRestPageMetadata(reviews.length, { page, perPage })
          },
          message: `Found **${reviews.length}** reviews on pull request **#${pullNumber}**.`
        };
      }

      if (method === 'get_comments') {
        let comments = (
          await client.listIssueComments(owner, repo, pullNumber, { page, perPage })
        ).map(mapConversationComment);
        return {
          output: {
            method,
            owner,
            repo,
            pullNumber,
            htmlUrl,
            comments,
            ...getRestPageMetadata(comments.length, { page, perPage })
          },
          message: `Found **${comments.length}** conversation comments on pull request **#${pullNumber}**.`
        };
      }

      let pullRequest = await client.getPullRequest(owner, repo, pullNumber);
      let headSha = pullRequest.head.sha;
      let result = await client.listCheckRunsForRef(owner, repo, headSha, {
        page,
        perPage
      });
      let checkRuns = (result.check_runs ?? []).map((checkRun: any) => ({
        checkRunId: checkRun.id,
        nodeId: checkRun.node_id,
        name: checkRun.name,
        status: checkRun.status,
        conclusion: checkRun.conclusion ?? null,
        headSha: checkRun.head_sha,
        detailsUrl: checkRun.details_url ?? null,
        htmlUrl: checkRun.html_url ?? null,
        startedAt: checkRun.started_at ?? null,
        completedAt: checkRun.completed_at ?? null,
        appName: checkRun.app?.name ?? null
      }));
      return {
        output: {
          method,
          owner,
          repo,
          pullNumber,
          htmlUrl,
          headSha,
          checkRuns,
          totalCount: result.total_count ?? checkRuns.length,
          ...getRestPageMetadata(checkRuns.length, { page, perPage })
        },
        message: `Found **${checkRuns.length}** check runs for pull request **#${pullNumber}**.`
      };
    } catch (error) {
      throw githubReadApiError(error, `${method.replaceAll('_', ' ')} for pull request`);
    }
  })
  .build();
