import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import type { GitHubClient } from '../lib/client';
import {
  createGitHubDiscussionClient,
  invalidDiscussionInput,
  requireDiscussionRepository
} from '../lib/github-discussions';
import { spec } from '../spec';

let methodSchema = z.enum([
  'add',
  'reply',
  'update',
  'delete',
  'mark_answer',
  'unmark_answer'
]);

type DiscussionCommentWriteMethod = z.infer<typeof methodSchema>;

interface DiscussionCommentWriteInput {
  method: DiscussionCommentWriteMethod;
  owner?: string;
  repo?: string;
  discussionNumber?: number;
  body?: string;
  commentNodeID?: string;
}

interface CommentResult {
  id: string;
  url: string;
}

let requireText = (
  input: DiscussionCommentWriteInput,
  field: 'owner' | 'repo' | 'body' | 'commentNodeID',
  method: DiscussionCommentWriteMethod
) => {
  let value = input[field];
  if (typeof value === 'string' && value.trim()) return value;
  throw invalidDiscussionInput(
    `${field} is required for the "${method}" method and cannot be blank.`,
    `github_discussion_comment_${method}_${field}_required`
  );
};

let requireDiscussionNumber = (
  input: DiscussionCommentWriteInput,
  method: DiscussionCommentWriteMethod
) => {
  let value = input.discussionNumber;
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  throw invalidDiscussionInput(
    `discussionNumber is required for the "${method}" method and must be a positive integer.`,
    `github_discussion_comment_${method}_discussion_number_required`
  );
};

let resolveDiscussionID = async (
  client: GitHubClient,
  owner: string,
  repo: string,
  discussionNumber: number
) => {
  let result = await client.requestGraphQL<{
    repository: { discussion: { id: string } | null } | null;
  }>(
    `query ResolveDiscussionID(
      $owner: String!
      $repo: String!
      $discussionNumber: Int!
    ) {
      repository(owner: $owner, name: $repo) {
        discussion(number: $discussionNumber) {
          id
        }
      }
    }`,
    { owner, repo, discussionNumber }
  );
  let repository = requireDiscussionRepository(result.repository, owner, repo);
  if (repository.discussion?.id) return repository.discussion.id;
  throw invalidDiscussionInput(
    `GitHub did not return discussion #${discussionNumber} in "${owner}/${repo}".`,
    'github_discussion_not_found'
  );
};

let addComment = async (
  client: GitHubClient,
  input: DiscussionCommentWriteInput,
  replyToID?: string
) => {
  let method: 'add' | 'reply' = replyToID ? 'reply' : 'add';
  let owner = requireText(input, 'owner', method);
  let repo = requireText(input, 'repo', method);
  let body = requireText(input, 'body', method);
  let discussionNumber = requireDiscussionNumber(input, method);
  let discussionID = await resolveDiscussionID(client, owner, repo, discussionNumber);
  if (replyToID) {
    let target = await client.requestGraphQL<{
      node: {
        id: string;
        discussion: { id: string };
      } | null;
    }>(
      `query ValidateDiscussionReplyTarget($replyToID: ID!) {
        node(id: $replyToID) {
          ... on DiscussionComment {
            id
            discussion {
              id
            }
          }
        }
      }`,
      { replyToID }
    );
    if (!target.node?.id) {
      throw invalidDiscussionInput(
        `commentNodeID "${replyToID}" does not resolve to a GitHub Discussion comment.`,
        'github_discussion_reply_comment_not_found'
      );
    }
    if (target.node.discussion.id !== discussionID) {
      throw invalidDiscussionInput(
        `commentNodeID "${replyToID}" does not belong to discussion #${discussionNumber} in "${owner}/${repo}".`,
        'github_discussion_reply_comment_mismatch'
      );
    }
  }

  let result = await client.requestGraphQL<{
    addDiscussionComment: { comment: CommentResult };
  }>(
    `mutation AddDiscussionComment($input: AddDiscussionCommentInput!) {
      addDiscussionComment(input: $input) {
        comment {
          id
          url
        }
      }
    }`,
    {
      input: {
        discussionId: discussionID,
        body,
        ...(replyToID ? { replyToId: replyToID } : {})
      }
    }
  );
  return result.addDiscussionComment.comment;
};

let updateComment = async (client: GitHubClient, input: DiscussionCommentWriteInput) => {
  let commentNodeID = requireText(input, 'commentNodeID', 'update');
  let body = requireText(input, 'body', 'update');
  let result = await client.requestGraphQL<{
    updateDiscussionComment: { comment: CommentResult };
  }>(
    `mutation UpdateDiscussionComment($input: UpdateDiscussionCommentInput!) {
      updateDiscussionComment(input: $input) {
        comment {
          id
          url
        }
      }
    }`,
    {
      input: {
        commentId: commentNodeID,
        body
      }
    }
  );
  return result.updateDiscussionComment.comment;
};

let deleteComment = async (client: GitHubClient, input: DiscussionCommentWriteInput) => {
  let commentNodeID = requireText(input, 'commentNodeID', 'delete');
  let result = await client.requestGraphQL<{
    deleteDiscussionComment: { comment: CommentResult | null };
  }>(
    `mutation DeleteDiscussionComment($input: DeleteDiscussionCommentInput!) {
      deleteDiscussionComment(input: $input) {
        comment {
          id
          url
        }
      }
    }`,
    { input: { id: commentNodeID } }
  );
  return (
    result.deleteDiscussionComment.comment ?? {
      id: commentNodeID,
      url: ''
    }
  );
};

let changeAnswerState = async (
  client: GitHubClient,
  input: DiscussionCommentWriteInput,
  method: 'mark_answer' | 'unmark_answer'
) => {
  let commentNodeID = requireText(input, 'commentNodeID', method);
  if (method === 'mark_answer') {
    let result = await client.requestGraphQL<{
      markDiscussionCommentAsAnswer: {
        discussion: { id: string; url: string };
      };
    }>(
      `mutation MarkDiscussionCommentAsAnswer(
        $input: MarkDiscussionCommentAsAnswerInput!
      ) {
        markDiscussionCommentAsAnswer(input: $input) {
          discussion {
            id
            url
          }
        }
      }`,
      { input: { id: commentNodeID } }
    );
    return result.markDiscussionCommentAsAnswer.discussion;
  }

  let result = await client.requestGraphQL<{
    unmarkDiscussionCommentAsAnswer: {
      discussion: { id: string; url: string };
    };
  }>(
    `mutation UnmarkDiscussionCommentAsAnswer(
      $input: UnmarkDiscussionCommentAsAnswerInput!
    ) {
      unmarkDiscussionCommentAsAnswer(input: $input) {
        discussion {
          id
          url
        }
      }
    }`,
    { input: { id: commentNodeID } }
  );
  return result.unmarkDiscussionCommentAsAnswer.discussion;
};

export let discussionCommentWrite = SlateTool.create(spec, {
  name: 'Manage Discussion Comments',
  key: 'discussion_comment_write',
  description:
    'Add, reply to, update, or delete GitHub Discussion comments, and mark or unmark a comment as the accepted answer for a Q&A discussion.',
  instructions: [
    'add requires owner, repo, discussionNumber, and body.',
    'reply requires owner, repo, discussionNumber, body, and the parent commentNodeID.',
    'update requires commentNodeID and body.',
    'delete, mark_answer, and unmark_answer require commentNodeID.',
    'GitHub Discussions support only one level of nested replies.'
  ],
  tags: { destructive: true }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      method: methodSchema.describe(
        'Write operation: add, reply, update, delete, mark_answer, or unmark_answer'
      ),
      owner: z.string().optional().describe('Repository owner; required for add and reply'),
      repo: z.string().optional().describe('Repository name; required for add and reply'),
      discussionNumber: z
        .number()
        .optional()
        .describe('Repository-local discussion number; required for add and reply'),
      body: z
        .string()
        .optional()
        .describe('Comment Markdown; required for add, reply, and update'),
      commentNodeID: z
        .string()
        .optional()
        .describe(
          'Discussion comment node ID; required for reply, update, delete, mark_answer, and unmark_answer. For reply, identify the top-level parent comment.'
        )
    })
  )
  .output(
    z.object({
      method: methodSchema.describe('Write operation performed'),
      comment: z
        .object({
          id: z.string().describe('Affected discussion comment node ID'),
          url: z.string().describe('Affected comment URL, when returned by GitHub')
        })
        .optional()
        .describe('Created, updated, or deleted comment metadata'),
      discussion: z
        .object({
          id: z.string().describe('Discussion node ID'),
          url: z.string().describe('Discussion URL')
        })
        .optional()
        .describe('Discussion whose answer state changed')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input as DiscussionCommentWriteInput;
    let client = createGitHubDiscussionClient(ctx.auth);
    if (input.method === 'add') {
      let comment = await addComment(client, input);
      return {
        output: { method: input.method, comment },
        message: `Added discussion comment **${comment.id}**.`
      };
    }
    if (input.method === 'reply') {
      let commentNodeID = requireText(input, 'commentNodeID', 'reply');
      let comment = await addComment(client, input, commentNodeID);
      return {
        output: { method: input.method, comment },
        message: `Added reply **${comment.id}** to discussion comment **${commentNodeID}**.`
      };
    }
    if (input.method === 'update') {
      let comment = await updateComment(client, input);
      return {
        output: { method: input.method, comment },
        message: `Updated discussion comment **${comment.id}**.`
      };
    }
    if (input.method === 'delete') {
      let comment = await deleteComment(client, input);
      return {
        output: { method: input.method, comment },
        message: `Deleted discussion comment **${comment.id}**.`
      };
    }
    if (input.method === 'mark_answer' || input.method === 'unmark_answer') {
      let discussion = await changeAnswerState(client, input, input.method);
      return {
        output: { method: input.method, discussion },
        message: `${input.method === 'mark_answer' ? 'Marked' : 'Unmarked'} comment **${input.commentNodeID}** ${input.method === 'mark_answer' ? 'as' : 'from'} the accepted answer.`
      };
    }
    throw invalidDiscussionInput(
      `Unknown discussion comment method "${String(input.method)}". Use add, reply, update, delete, mark_answer, or unmark_answer.`,
      'github_discussion_comment_unknown_method'
    );
  })
  .build();
