import { SlateTool } from 'slates';
import { z } from 'zod';
import { type AlgoliaItem, SearchClient } from '../lib/search-client';
import { spec } from '../spec';

let commentSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    commentId: z.number().describe('Unique ID of the comment'),
    author: z.string().optional().describe('Username of the comment author when available'),
    text: z.string().optional().describe('HTML text content of the comment'),
    createdAt: z
      .string()
      .optional()
      .describe('ISO 8601 timestamp of the comment when available'),
    children: z.array(commentSchema).describe('Nested child comments')
  })
);

interface CommentTree {
  commentId: number;
  author?: string;
  text?: string;
  createdAt?: string;
  children: CommentTree[];
}

let mapCommentTree = (item: AlgoliaItem): CommentTree => ({
  commentId: item.id,
  author: item.author ?? undefined,
  text: item.text ?? undefined,
  createdAt: item.created_at ?? undefined,
  children: item.children.map(mapCommentTree)
});

export let getCommentTree = SlateTool.create(spec, {
  name: 'Get Comment Tree',
  key: 'get_comment_tree',
  description: `Retrieve the full nested comment tree for a Hacker News story in a single request via Algolia.
Unlike the Firebase API which requires recursive fetching of each comment, this returns the entire comment hierarchy at once.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      storyId: z.number().describe('ID of the Hacker News story to get comments for')
    })
  )
  .output(
    z.object({
      storyId: z.number().describe('ID of the story'),
      title: z.string().optional().describe('Title of the story'),
      author: z.string().optional().describe('Author of the story'),
      url: z.string().optional().describe('URL of the story'),
      points: z.number().optional().describe('Score/points of the story'),
      createdAt: z.string().optional().describe('ISO 8601 timestamp of the story'),
      comments: z.array(commentSchema).describe('Nested comment tree'),
      totalComments: z.number().describe('Number of comment nodes returned in the tree'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original item response, including nested comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchClient();
    let item = await client.getItem(ctx.input.storyId);

    let countComments = (children: AlgoliaItem[]): number => {
      let count = children.length;
      for (let child of children) {
        count += countComments(child.children);
      }
      return count;
    };

    let comments = item.children.map(mapCommentTree);
    let totalComments = countComments(item.children);

    return {
      output: {
        storyId: item.id,
        title: item.title ?? undefined,
        author: item.author ?? undefined,
        url: item.url ?? undefined,
        points: item.points ?? undefined,
        createdAt: item.created_at ?? undefined,
        comments,
        totalComments,
        raw: item
      },
      message: `Retrieved comment tree for **${item.title || `story ${item.id}`}** with **${totalComments}** comments.`
    };
  })
  .build();
