import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let postQuestion = SlateTool.create(spec, {
  name: 'Post Question',
  key: 'post_question',
  description: `Create a new question on a Stack Exchange site. Requires OAuth with **write_access** scope. The question must have a title, body, and at least one tag.`,
  constraints: [
    'Requires authenticated user with write_access scope.',
    'The question body should follow Stack Exchange formatting guidelines (Markdown/HTML).',
    'At least one tag is required.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the question'),
      body: z.string().describe('Body of the question (Markdown/HTML)'),
      tags: z
        .array(z.string())
        .min(1)
        .describe('Tags for the question (at least one required)')
    })
  )
  .output(
    z.object({
      questionId: z.number().describe('ID of the newly created question'),
      title: z.string().describe('Title of the question'),
      link: z.string().describe('URL to the question')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let result = await client.createQuestion(ctx.input.title, ctx.input.body, ctx.input.tags);
    let q = result.items[0];

    if (!q) {
      throw new Error('Failed to create question. Ensure you have write_access scope.');
    }

    return {
      output: {
        questionId: q.question_id,
        title: q.title,
        link: q.link
      },
      message: `Created question **"${q.title}"** — [View](${q.link})`
    };
  })
  .build();
