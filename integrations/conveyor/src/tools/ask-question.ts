import { createApiServiceError, SlateTool } from 'slates';
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
      question: z.string().describe('The security question to ask'),
      productLineIds: z
        .string()
        .optional()
        .describe(
          'Comma-separated product line IDs from list_product_lines; omit for all products'
        ),
      questionType: z
        .enum(['free_response', 'select_one', 'select_multiple'])
        .optional()
        .describe('Answer format; the provider defaults to free_response'),
      multipleChoiceOptions: z
        .array(z.string())
        .optional()
        .describe('Required choices for select_one or select_multiple'),
      confidenceThreshold: z
        .enum(['high', 'medium', 'low'])
        .optional()
        .describe('Only return answers meeting this confidence threshold'),
      email: z.string().optional().describe('Email to attribute this question to in analytics')
    })
  )
  .output(
    z.object({
      answer: z.any().describe('AI-generated answer from the knowledge library')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });
    if (!ctx.input.question.trim())
      throw createApiServiceError('Provide a non-empty security question.');
    if (
      ctx.input.questionType &&
      ctx.input.questionType !== 'free_response' &&
      !ctx.input.multipleChoiceOptions?.length
    ) {
      throw createApiServiceError(
        'Provide multipleChoiceOptions for select_one or select_multiple questions.'
      );
    }
    let result = await client.askQuestion(ctx.input.question, ctx.input);

    return {
      output: {
        answer: result
      },
      message: `Answered question: "${ctx.input.question}"`
    };
  })
  .build();
