import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchClient } from '../lib/search-client';
import { spec } from '../spec';

let commentSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    commentId: z.number().describe('Unique ID of the comment'),
    author: z.string().describe('Username of the comment author'),
    text: z.string().optional().describe('HTML text content of the comment'),
    createdAt: z.string().describe('ISO 8601 timestamp of the comment'),
    children: z.array(commentSchema).describe('Nested child comments')
  })
);

let mapCommentTree = (item: any): any => ({
  commentId: item.id,
  author: item.author || '',
  text: item.text,
  createdAt: item.created_at,
  children: (item.children || []).map(mapCommentTree)
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
      totalComments: z.number().describe('Total number of comments in the tree')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchClient();
    let item = await client.getItem(ctx.input.storyId);

    let countComments = (children: any[]): number => {
      let count = children.length;
      for (let child of children) {
        count += countComments(child.children || []);
      }
      return count;
    };

    let comments = (item.children || []).map(mapCommentTree);
    let totalComments = countComments(item.children || []);

    return {
      output: {
        storyId: item.id,
        title: item.title,
        author: item.author,
        url: item.url,
        points: item.points,
        createdAt: item.created_at,
        comments,
        totalComments
      },
      message: `Retrieved comment tree for **${item.title || `story ${item.id}`}** with **${totalComments}** comments.`
    };
  })
  .build();
