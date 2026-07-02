import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateHeadline = SlateTool.create(spec, {
  name: 'Generate Headline',
  key: 'generate_headline',
  description: `Generate a concise headline or summary from text using Metatext AI's pre-built headline model. Useful for summarizing news articles, creating titles for content, or condensing long text into a brief headline.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text or article to generate a headline from')
    })
  )
  .output(
    z.object({
      generatedText: z.string().describe('The generated headline or summary')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.generateHeadline(ctx.input.text);

    return {
      output: result,
      message: `Generated a headline from the provided text.`
    };
  })
  .build();
