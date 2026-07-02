import { SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

let agentMessageSchema = z.object({
  role: z.enum(['user', 'assistant']).describe('Message role'),
  content: z.string().describe('Message content')
});

export let agentCompletionTool = SlateTool.create(spec, {
  name: 'Agent Completion',
  key: 'agent_completion',
  description: `Send messages to a Mistral AI agent and get a completion. Agents combine language models with built-in connectors for code execution, web search, image generation, and document libraries. Agents are created in the Mistral AI console.`,
  instructions: [
    'You must first create an agent in the Mistral AI console (https://console.mistral.ai) to get an agent ID.',
    'Agents have pre-configured tools and instructions that determine their behavior.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('Mistral AI agent ID'),
      messages: z
        .array(agentMessageSchema)
        .describe('Conversation messages to send to the agent'),
      maxTokens: z.number().optional().describe('Maximum tokens to generate'),
      stop: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Stop sequence(s)'),
      randomSeed: z.number().optional().describe('Seed for deterministic output'),
      responseFormat: z.any().optional().describe('Response format specification'),
      presencePenalty: z
        .number()
        .min(-2)
        .max(2)
        .optional()
        .describe('Presence penalty (-2.0 to 2.0)'),
      frequencyPenalty: z
        .number()
        .min(-2)
        .max(2)
        .optional()
        .describe('Frequency penalty (-2.0 to 2.0)')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique completion ID'),
      model: z.string().describe('Model used by the agent'),
      content: z.string().nullable().describe('Agent response content'),
      finishReason: z.string().describe('Reason generation stopped'),
      usage: z.object({
        promptTokens: z.number().describe('Tokens in the prompt'),
        completionTokens: z.number().describe('Tokens generated'),
        totalTokens: z.number().describe('Total tokens used')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.agentCompletion({
      agentId: ctx.input.agentId,
      messages: ctx.input.messages,
      maxTokens: ctx.input.maxTokens,
      stop: ctx.input.stop,
      randomSeed: ctx.input.randomSeed,
      responseFormat: ctx.input.responseFormat,
      presencePenalty: ctx.input.presencePenalty,
      frequencyPenalty: ctx.input.frequencyPenalty
    });

    let choice = result.choices?.[0];
    let content = choice?.message?.content || '';
    let preview = content.length > 200 ? `${content.substring(0, 200)}...` : content;

    return {
      output: {
        completionId: result.id,
        model: result.model,
        content: choice?.message?.content ?? null,
        finishReason: choice?.finish_reason || 'unknown',
        usage: {
          promptTokens: result.usage?.prompt_tokens || 0,
          completionTokens: result.usage?.completion_tokens || 0,
          totalTokens: result.usage?.total_tokens || 0
        }
      },
      message: `Agent responded using **${result.model}** (${result.usage?.total_tokens || 0} tokens).\n\n${preview}`
    };
  })
  .build();
