import { createApiServiceError } from 'slates';
import { GitHubClient, type GitHubClientConfig } from './client';

type GitHubRecord = Record<string, any>;
type ReviewEvent = 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES';
type DiffSide = 'LEFT' | 'RIGHT';

export interface PendingReviewCommentInput {
  owner: string;
  repo: string;
  pullNumber: number;
  path: string;
  body: string;
  subjectType: 'FILE' | 'LINE';
  line?: number;
  side?: DiffSide;
  startLine?: number;
  startSide?: DiffSide;
}

let encode = (value: string | number) => encodeURIComponent(String(value));
let error = (message: string, reason: string) => createApiServiceError(message, { reason });

export let splitPullRequestReviewers = (reviewers: string[]) => {
  let users: string[] = [];
  let teams: string[] = [];
  for (let reviewer of reviewers) {
    let parts = reviewer.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) {
      teams.push(parts[1]);
    } else {
      users.push(reviewer);
    }
  }
  return { users, teams };
};

export class GitHubPullRequestWritesApi {
  private client: GitHubClient;

  constructor(auth: GitHubClientConfig) {
    this.client = new GitHubClient(auth);
  }

  private pullPath(owner: string, repo: string, pullNumber?: number) {
    let base = `/repos/${encode(owner)}/${encode(repo)}/pulls`;
    return pullNumber === undefined ? base : `${base}/${encode(pullNumber)}`;
  }

  async createPullRequest(
    owner: string,
    repo: string,
    input: {
      title: string;
      head: string;
      base: string;
      body?: string;
      draft?: boolean;
      maintainerCanModify?: boolean;
      reviewers?: string[];
    }
  ) {
    let pullRequest = await this.client.requestRest<GitHubRecord>({
      method: 'POST',
      path: this.pullPath(owner, repo),
      operation: 'create pull request',
      reason: 'github_create_pull_request_failed',
      body: {
        title: input.title,
        head: input.head,
        base: input.base,
        body: input.body,
        draft: input.draft,
        maintainer_can_modify: input.maintainerCanModify
      }
    });
    if (input.reviewers && input.reviewers.length > 0) {
      await this.requestReviewers(owner, repo, pullRequest.number, input.reviewers);
    }
    return pullRequest;
  }

  private async changeDraftState(
    owner: string,
    repo: string,
    pullNumber: number,
    draft: boolean
  ) {
    let found = await this.client.requestGraphQL<{
      repository?: {
        pullRequest?: { id?: string; isDraft?: boolean } | null;
      } | null;
    }>(
      `query FindPullRequestForDraftChange(
        $owner: String!
        $repo: String!
        $pullNumber: Int!
      ) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $pullNumber) { id isDraft }
        }
      }`,
      { owner, repo, pullNumber }
    );
    let pullRequest = found.repository?.pullRequest;
    if (!pullRequest?.id) {
      throw error(
        `Pull request ${owner}/${repo}#${pullNumber} was not found.`,
        'github_pull_request_not_found'
      );
    }
    if (pullRequest.isDraft === draft) {
      return;
    }

    if (draft) {
      await this.client.requestGraphQL(
        `mutation ConvertPullRequestToDraft($input: ConvertPullRequestToDraftInput!) {
          convertPullRequestToDraft(input: $input) {
            pullRequest { id isDraft }
          }
        }`,
        { input: { pullRequestId: pullRequest.id } }
      );
      return;
    }
    await this.client.requestGraphQL(
      `mutation MarkPullRequestReady($input: MarkPullRequestReadyForReviewInput!) {
        markPullRequestReadyForReview(input: $input) {
          pullRequest { id isDraft }
        }
      }`,
      { input: { pullRequestId: pullRequest.id } }
    );
  }

  async updatePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    input: {
      title?: string;
      body?: string;
      state?: 'closed' | 'open';
      draft?: boolean;
      base?: string;
      maintainerCanModify?: boolean;
      reviewers?: string[];
    }
  ) {
    let restBody: GitHubRecord = {};
    if (input.title !== undefined) restBody.title = input.title;
    if (input.body !== undefined) restBody.body = input.body;
    if (input.state !== undefined) restBody.state = input.state;
    if (input.base !== undefined) restBody.base = input.base;
    if (input.maintainerCanModify !== undefined) {
      restBody.maintainer_can_modify = input.maintainerCanModify;
    }
    if (Object.keys(restBody).length > 0) {
      await this.client.requestRest({
        method: 'PATCH',
        path: this.pullPath(owner, repo, pullNumber),
        operation: 'update pull request',
        reason: 'github_update_pull_request_failed',
        body: restBody
      });
    }
    if (input.draft !== undefined) {
      await this.changeDraftState(owner, repo, pullNumber, input.draft);
    }
    if (input.reviewers && input.reviewers.length > 0) {
      await this.requestReviewers(owner, repo, pullNumber, input.reviewers);
    }
    return await this.client.requestRest<GitHubRecord>({
      method: 'GET',
      path: this.pullPath(owner, repo, pullNumber),
      operation: 'get updated pull request',
      reason: 'github_get_updated_pull_request_failed'
    });
  }

  async requestReviewers(
    owner: string,
    repo: string,
    pullNumber: number,
    reviewers: string[],
    teamReviewers: string[] = []
  ) {
    let split = splitPullRequestReviewers(reviewers);
    return await this.client.requestRest<GitHubRecord>({
      method: 'POST',
      path: `${this.pullPath(owner, repo, pullNumber)}/requested_reviewers`,
      operation: 'request pull request reviewers',
      reason: 'github_request_pull_request_reviewers_failed',
      body: {
        reviewers: split.users,
        team_reviewers: [...split.teams, ...teamReviewers]
      }
    });
  }

  private async findPullRequestNodeId(owner: string, repo: string, pullNumber: number) {
    let result = await this.client.requestGraphQL<{
      repository?: { pullRequest?: { id?: string } | null } | null;
    }>(
      `query FindPullRequest(
        $owner: String!
        $repo: String!
        $pullNumber: Int!
      ) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $pullNumber) { id }
        }
      }`,
      { owner, repo, pullNumber }
    );
    let id = result.repository?.pullRequest?.id;
    if (!id) {
      throw error(
        `Pull request ${owner}/${repo}#${pullNumber} was not found.`,
        'github_pull_request_not_found'
      );
    }
    return id;
  }

  async createReview(input: {
    owner: string;
    repo: string;
    pullNumber: number;
    body?: string;
    event?: ReviewEvent;
    commitID?: string;
  }) {
    let pullRequestId = await this.findPullRequestNodeId(
      input.owner,
      input.repo,
      input.pullNumber
    );
    let mutationInput: GitHubRecord = { pullRequestId };
    if (input.commitID !== undefined) mutationInput.commitOID = input.commitID;
    if (input.event !== undefined) {
      mutationInput.event = input.event;
      mutationInput.body = input.body ?? '';
    }
    let result = await this.client.requestGraphQL<{
      addPullRequestReview?: {
        pullRequestReview?: GitHubRecord | null;
      } | null;
    }>(
      `mutation CreatePullRequestReview($input: AddPullRequestReviewInput!) {
        addPullRequestReview(input: $input) {
          pullRequestReview { id state url }
        }
      }`,
      { input: mutationInput }
    );
    let review = result.addPullRequestReview?.pullRequestReview;
    if (!review?.id) {
      throw error(
        'GitHub did not return the created pull request review.',
        'github_create_pull_request_review_empty'
      );
    }
    return review;
  }

  async createActionReview(input: {
    owner: string;
    repo: string;
    pullNumber: number;
    body?: string;
    event: ReviewEvent;
    comments?: Array<{ path: string; position?: number; body: string }>;
  }) {
    return await this.client.requestRest<GitHubRecord>({
      method: 'POST',
      path: `${this.pullPath(input.owner, input.repo, input.pullNumber)}/reviews`,
      operation: 'create pull request review',
      reason: 'github_create_pull_request_review_failed',
      body: {
        body: input.body,
        event: input.event,
        comments: input.comments
      }
    });
  }

  private async findPendingReview(owner: string, repo: string, pullNumber: number) {
    let viewer = await this.client.requestGraphQL<{ viewer?: { login?: string } | null }>(
      `query PullRequestReviewViewer { viewer { login } }`,
      {}
    );
    let login = viewer.viewer?.login;
    if (!login) {
      throw error(
        'GitHub did not return the current reviewer login.',
        'github_pull_request_reviewer_unknown'
      );
    }
    let result = await this.client.requestGraphQL<{
      repository?: {
        pullRequest?: {
          reviews?: {
            nodes?: Array<{ id?: string; state?: string; url?: string }>;
          };
        } | null;
      } | null;
    }>(
      `query FindPendingPullRequestReview(
        $owner: String!
        $repo: String!
        $pullNumber: Int!
        $author: String!
      ) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $pullNumber) {
            reviews(first: 1, author: $author) {
              nodes { id state url }
            }
          }
        }
      }`,
      { owner, repo, pullNumber, author: login }
    );
    let review = result.repository?.pullRequest?.reviews?.nodes?.[0];
    if (!review?.id) {
      throw error(
        'No pending review was found for the current GitHub user.',
        'github_pending_pull_request_review_not_found'
      );
    }
    if (review.state !== 'PENDING') {
      throw error(
        `The latest review${review.url ? ` at ${review.url}` : ''} is not pending.`,
        'github_pull_request_review_not_pending'
      );
    }
    return review;
  }

  async submitPendingReview(input: {
    owner: string;
    repo: string;
    pullNumber: number;
    body?: string;
    event: ReviewEvent;
  }) {
    let review = await this.findPendingReview(input.owner, input.repo, input.pullNumber);
    let result = await this.client.requestGraphQL<{
      submitPullRequestReview?: { pullRequestReview?: GitHubRecord | null } | null;
    }>(
      `mutation SubmitPendingPullRequestReview(
        $input: SubmitPullRequestReviewInput!
      ) {
        submitPullRequestReview(input: $input) {
          pullRequestReview { id state url }
        }
      }`,
      {
        input: {
          pullRequestReviewId: review.id,
          event: input.event,
          body: input.body
        }
      }
    );
    return (
      result.submitPullRequestReview?.pullRequestReview ?? {
        id: review.id,
        state: input.event
      }
    );
  }

  async deletePendingReview(owner: string, repo: string, pullNumber: number) {
    let review = await this.findPendingReview(owner, repo, pullNumber);
    await this.client.requestGraphQL(
      `mutation DeletePendingPullRequestReview(
        $input: DeletePullRequestReviewInput!
      ) {
        deletePullRequestReview(input: $input) {
          pullRequestReview { id state }
        }
      }`,
      { input: { pullRequestReviewId: review.id } }
    );
    return { reviewId: review.id, deleted: true };
  }

  async setThreadResolved(threadId: string, resolved: boolean) {
    let operation = resolved ? 'resolveReviewThread' : 'unresolveReviewThread';
    let inputType = resolved ? 'ResolveReviewThreadInput' : 'UnresolveReviewThreadInput';
    let result = await this.client.requestGraphQL<Record<string, any>>(
      `mutation ChangeReviewThread($input: ${inputType}!) {
        ${operation}(input: $input) {
          thread { id isResolved }
        }
      }`,
      { input: { threadId } }
    );
    let thread = result[operation]?.thread;
    if (!thread?.id) {
      throw error(
        'GitHub did not return the updated review thread.',
        'github_pull_request_review_thread_empty'
      );
    }
    return thread;
  }

  async addPendingReviewComment(input: PendingReviewCommentInput) {
    let review = await this.findPendingReview(input.owner, input.repo, input.pullNumber);
    let mutationInput: GitHubRecord = {
      pullRequestReviewId: review.id,
      path: input.path,
      body: input.body,
      subjectType: input.subjectType
    };
    if (input.line !== undefined) mutationInput.line = input.line;
    if (input.side !== undefined) mutationInput.side = input.side;
    if (input.startLine !== undefined) mutationInput.startLine = input.startLine;
    if (input.startSide !== undefined) mutationInput.startSide = input.startSide;

    let result = await this.client.requestGraphQL<{
      addPullRequestReviewThread?: { thread?: GitHubRecord | null } | null;
    }>(
      `mutation AddPendingReviewComment(
        $input: AddPullRequestReviewThreadInput!
      ) {
        addPullRequestReviewThread(input: $input) {
          thread { id isResolved path line startLine }
        }
      }`,
      { input: mutationInput }
    );
    let thread = result.addPullRequestReviewThread?.thread;
    if (!thread?.id) {
      throw error(
        'GitHub could not add the pending review comment. Check the diff path, line range, and sides.',
        'github_add_pending_review_comment_empty'
      );
    }
    return thread;
  }

  async addReplyOrReaction(input: {
    owner: string;
    repo: string;
    pullNumber?: number;
    commentId: number;
    body?: string;
    reaction?: string;
  }) {
    let result: GitHubRecord = {};
    if (input.reaction !== undefined) {
      result.reaction = await this.client.requestRest<GitHubRecord>({
        method: 'POST',
        path: `/repos/${encode(input.owner)}/${encode(input.repo)}/pulls/comments/${encode(input.commentId)}/reactions`,
        operation: 'add reaction to pull request review comment',
        reason: 'github_add_pull_request_comment_reaction_failed',
        body: { content: input.reaction },
        headers: { Accept: 'application/vnd.github+json' }
      });
    }
    if (input.body !== undefined) {
      result.comment = await this.client.requestRest<GitHubRecord>({
        method: 'POST',
        path: `${this.pullPath(input.owner, input.repo, input.pullNumber)}/comments/${encode(input.commentId)}/replies`,
        operation: 'reply to pull request review comment',
        reason: 'github_reply_to_pull_request_comment_failed',
        body: { body: input.body }
      });
    }
    if (input.body !== undefined && input.reaction === undefined) {
      return result.comment;
    }
    if (input.reaction !== undefined && input.body === undefined) {
      return result.reaction;
    }
    return result;
  }
}
