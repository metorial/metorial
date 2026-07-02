import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateText = SlateTool.create(spec, {
  name: 'Generate Text',
  key: 'generate_text',
  description: `Generate text content from a prompt using Metatext AI's pre-built text generation model. Suitable for general-purpose text generation, creative writing, content expansion, and other generative tasks.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The prompt or seed text to generate content from')
    })
  )
  .output(
    z.object({
      generatedText: z.string().describe('The generated text content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.generateText(ctx.input.text);

    return {
      output: result,
      message: `Generated text from the provided prompt.`
    };
  })
  .build();
