import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getQuestion = SlateTool.create(spec, {
  name: 'Get Question',
  key: 'get_question',
  description: `Retrieve detailed information about a specific question from the question library, including its description, test cases, difficulty, and supported languages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      questionId: z.string().describe('ID of the question to retrieve')
    })
  )
  .output(
    z.object({
      question: z.record(z.string(), z.any()).describe('Full question details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getQuestion(ctx.input.questionId);
    let question = result.data ?? result;

    return {
      output: {
        question
      },
      message: `Retrieved question **${question.name ?? question.title ?? ctx.input.questionId}**.`
    };
  });
