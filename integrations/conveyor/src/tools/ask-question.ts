import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

export let askQuestion = SlateTool.create(spec, {
  name: 'Ask Security Question',
  key: 'ask_question',
  description: `Ask a single security question and receive an AI-generated answer from your Conveyor knowledge library. Useful for integrating Conveyor's answer capability into other tools, workflows, or chatbots.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      question: z.string().describe('The security question to ask')
    })
  )
  .output(
    z.object({
      answer: z.any().describe('AI-generated answer from the knowledge library')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });
    let result = await client.askQuestion(ctx.input.question);

    return {
      output: {
        answer: result
      },
      message: `Answered question: "${ctx.input.question}"`
    };
  })
  .build();
