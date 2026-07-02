import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateBlogPost = SlateTool.create(spec, {
  name: 'Generate Blog Post',
  key: 'generate_blog_post',
  description: `Generate blog post content from a prompt or topic using Metatext AI's pre-built blog post generation model. Provide a topic, title, or brief description and receive generated blog content.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The prompt, topic, or title to generate a blog post from')
    })
  )
  .output(
    z.object({
      generatedText: z.string().describe('The generated blog post content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.generateBlogPost(ctx.input.text);

    return {
      output: result,
      message: `Generated a blog post from the provided prompt.`
    };
  })
  .build();
