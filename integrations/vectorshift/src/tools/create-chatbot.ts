import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, createChatbot } from '../lib/client';
import { spec } from '../spec';

export let createChatbotTool = SlateTool.create(spec, {
  name: 'Create Chatbot',
  key: 'create_chatbot',
  description: `Create a new chatbot in VectorShift backed by a pipeline. Chatbots can be used for customer support, onboarding, lead collection, and advisory workflows.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the chatbot'),
      description: z.string().describe('Description of the chatbot'),
      pipelineId: z.string().describe('ID of the pipeline that powers this chatbot'),
      pipelineVersion: z
        .string()
        .optional()
        .default('latest')
        .describe('Pipeline version to use (defaults to "latest")'),
      input: z.string().optional().describe('Input specification for the chatbot'),
      output: z.string().optional().describe('Output specification for the chatbot'),
      deployed: z.boolean().optional().describe('Whether to deploy the chatbot immediately')
    })
  )
  .output(
    z.object({
      chatbotId: z.string().describe('ID of the newly created chatbot')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await createChatbot(api, {
      name: ctx.input.name,
      description: ctx.input.description,
      pipelineId: ctx.input.pipelineId,
      pipelineVersion: ctx.input.pipelineVersion,
      input: ctx.input.input,
      output: ctx.input.output,
      deployed: ctx.input.deployed
    });

    return {
      output: {
        chatbotId: result.id
      },
      message: `Chatbot **${ctx.input.name}** created with ID \`${result.id}\`.`
    };
  })
  .build();
