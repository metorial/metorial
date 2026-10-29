import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let echo = SlateTool.create(spec, {
  name: 'Echo',
  key: 'echo',
  description: `Return the given text unchanged.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('Text to echo back')
    })
  )
  .output(
    z.object({
      text: z.string().describe('The same text that was sent')
    })
  )
  .handleInvocation(async ctx => ({
    output: { text: ctx.input.text },
    message: ctx.input.text
  }))
  .build();
