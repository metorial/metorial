import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import {
  createGitHubDiscussionClient,
  invalidDiscussionInput,
  requireDiscussionRepository
} from '../lib/github-discussions';
import { spec } from '../spec';

interface DiscussionResponse {
  repository: {
    discussion: {
      id: string;
      number: number;
      title: string;
      body: string;
      url: string;
      createdAt: string;
      updatedAt: string;
      closed: boolean;
      isAnswered: boolean;
      answerChosenAt: string | null;
      author: { login: string } | null;
      category: { id: string; name: string };
    } | null;
  } | null;
}

export let getDiscussion = SlateTool.create(spec, {
  name: 'Get Discussion',
  key: 'get_discussion',
  description:
    'Get a GitHub Discussion by repository-local number, including its Markdown body, category, answer state, author, timestamps, and permalink.',
  tags: { readOnly: true }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      discussionNumber: z.number().describe('Repository-local discussion number')
    })
  )
  .output(
    z.object({
      repository: z.string().describe('Repository in owner/name format'),
      discussion: z.object({
        id: z.string().describe('Discussion node ID'),
        number: z.number().describe('Repository-local discussion number'),
        title: z.string().describe('Discussion title'),
        body: z.string().describe('Discussion body in Markdown'),
        url: z.string().describe('Discussion URL on GitHub'),
        createdAt: z.string().describe('Creation timestamp'),
        updatedAt: z.string().describe('Last update timestamp'),
        closed: z.boolean().describe('Whether the discussion is closed'),
        isAnswered: z.boolean().describe('Whether the discussion has an accepted answer'),
        answerChosenAt: z
          .string()
          .nullable()
          .describe('Timestamp when an answer was chosen, or null'),
        author: z
          .object({ login: z.string().describe('Discussion author login') })
          .nullable()
          .describe('Discussion author, or null for a deleted account'),
        category: z.object({
          id: z.string().describe('Discussion category node ID'),
          name: z.string().describe('Discussion category name')
        })
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createGitHubDiscussionClient(ctx.auth);
    let result = await client.requestGraphQL<DiscussionResponse>(
      `query GetDiscussion(
        $owner: String!
        $repo: String!
        $discussionNumber: Int!
      ) {
        repository(owner: $owner, name: $repo) {
          discussion(number: $discussionNumber) {
            id
            number
            title
            body
            url
            createdAt
            updatedAt
            closed
            isAnswered
            answerChosenAt
            author {
              login
            }
            category {
              id
              name
            }
          }
        }
      }`,
      {
        owner: ctx.input.owner,
        repo: ctx.input.repo,
        discussionNumber: ctx.input.discussionNumber
      }
    );
    let repository = requireDiscussionRepository(
      result.repository,
      ctx.input.owner,
      ctx.input.repo
    );
    if (!repository.discussion) {
      throw invalidDiscussionInput(
        `GitHub did not return discussion #${ctx.input.discussionNumber} in "${ctx.input.owner}/${ctx.input.repo}".`,
        'github_discussion_not_found'
      );
    }

    return {
      output: {
        repository: `${ctx.input.owner}/${ctx.input.repo}`,
        discussion: repository.discussion
      },
      message: `Read discussion **#${ctx.input.discussionNumber}** in **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
