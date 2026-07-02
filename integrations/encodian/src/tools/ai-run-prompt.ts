import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let aiRunPrompt = SlateTool.create(spec, {
  name: 'AI Run Prompt',
  key: 'ai_run_prompt',
  description: `Execute an AI prompt using Encodian's integrated AI models. Supports conversation context, system instructions, and configurable model parameters for text generation, analysis, and processing tasks.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      model: z.enum(['GPT_4_1', 'GPT_4_1_mini', 'o4_mini']).describe('AI model to use'),
      prompt: z.string().describe('The prompt/instructions to send to the AI model'),
      conversation: z
        .string()
        .optional()
        .describe('JSON chat history for multi-turn conversations'),
      context: z.string().optional().describe('System context and rules for the AI model'),
      frequencyPenalty: z.number().optional().describe('Frequency penalty (-2 to 2)'),
      maxOutputTokens: z.number().optional().describe('Maximum number of output tokens'),
      presencePenalty: z.number().optional().describe('Presence penalty (-2 to 2)'),
      temperature: z.number().optional().describe('Temperature (0 to 1)')
    })
  )
  .output(
    z.object({
      response: z.string().describe('AI model response text'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      model: ctx.input.model,
      prompt: ctx.input.prompt
    };

    if (ctx.input.conversation) body.conversation = ctx.input.conversation;
    if (ctx.input.context) body.context = ctx.input.context;
    if (ctx.input.frequencyPenalty !== undefined)
      body.frequencyPenalty = ctx.input.frequencyPenalty;
    if (ctx.input.maxOutputTokens !== undefined)
      body.maxOutputTokens = ctx.input.maxOutputTokens;
    if (ctx.input.presencePenalty !== undefined)
      body.presencePenalty = ctx.input.presencePenalty;
    if (ctx.input.temperature !== undefined) body.temperature = ctx.input.temperature;

    let result = await client.aiRunPrompt(body);

    return {
      output: {
        response: result.result || result.Result || result.text || '',
        operationId: result.OperationId || ''
      },
      message: `Successfully executed AI prompt using **${ctx.input.model}**.`
    };
  })
  .build();
