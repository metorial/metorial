import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  chatMessageSchema,
  keepAliveSchema,
  logprobSchema,
  modelOptionsSchema,
  thinkSchema,
  toolDefinitionSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let chat = SlateTool.create(spec, {
  name: 'Chat',
  key: 'chat',
  description: `Send a chat conversation to a model and get the next assistant message. Supports multi-turn conversations with message history, tool/function calling, multimodal inputs (images), structured outputs, and reasoning/thinking.`,
  instructions: [
    'Provide the full conversation history in **messages** for multi-turn conversations.',
    'To use tool calling, define available **tools** and handle tool call responses by including tool role messages in follow-up requests.',
    'For vision models, include base64-encoded images in the message **images** field.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z.string().describe('Name of the model to use (e.g., "llama3.2", "gemma3").'),
      messages: z
        .array(chatMessageSchema)
        .describe('Conversation messages with roles: system, user, assistant, or tool.'),
      tools: z
        .array(toolDefinitionSchema)
        .optional()
        .describe(
          'Tool definitions for function calling. The model may invoke these tools in its response.'
        ),
      format: z
        .any()
        .optional()
        .describe(
          'Output format: "json" for JSON mode, or a JSON schema object for structured output.'
        ),
      think: thinkSchema,
      logprobs: z
        .boolean()
        .optional()
        .describe('Return log probabilities for generated tokens.'),
      topLogprobs: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of likely alternative tokens to return when logprobs is enabled.'),
      keepAlive: keepAliveSchema,
      options: modelOptionsSchema
    })
  )
  .output(
    z.object({
      model: z.string().describe('Model used for the chat.'),
      createdAt: z.string().describe('ISO 8601 timestamp of the response.'),
      message: z
        .object({
          role: z.string().describe('Role of the response message (typically "assistant").'),
          content: z.string().describe('Text content of the assistant response.'),
          thinking: z
            .string()
            .optional()
            .describe("The model's reasoning process, if think was enabled."),
          toolCalls: z
            .array(
              z.object({
                function: z.object({
                  name: z.string().describe('Name of the tool function to call.'),
                  arguments: z
                    .record(z.string(), z.unknown())
                    .describe('Arguments for the tool function.')
                })
              })
            )
            .optional()
            .describe('Tool calls the model wants to make.')
        })
        .describe("The assistant's response message."),
      done: z.boolean().describe('Whether generation is complete.'),
      doneReason: z.string().optional().describe('Reason generation stopped.'),
      totalDuration: z.number().optional().describe('Total time in nanoseconds.'),
      promptEvalCount: z.number().optional().describe('Number of prompt tokens evaluated.'),
      evalCount: z.number().optional().describe('Number of tokens generated.'),
      logprobs: z
        .array(logprobSchema)
        .optional()
        .describe('Log probability information when logprobs was requested.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.chat({
      model: ctx.input.model,
      messages: ctx.input.messages,
      tools: ctx.input.tools,
      format: ctx.input.format,
      think: ctx.input.think,
      logprobs: ctx.input.logprobs,
      topLogprobs: ctx.input.topLogprobs,
      keepAlive: ctx.input.keepAlive,
      options: ctx.input.options
    });

    let toolCallInfo = result.message.toolCalls?.length
      ? ` Model requested **${result.message.toolCalls.length}** tool call(s).`
      : '';
    let contentPreview =
      result.message.content.length > 100
        ? `${result.message.content.substring(0, 100)}...`
        : result.message.content;

    return {
      output: {
        model: result.model,
        createdAt: result.createdAt,
        message: result.message,
        done: result.done,
        doneReason: result.doneReason,
        totalDuration: result.totalDuration,
        promptEvalCount: result.promptEvalCount,
        evalCount: result.evalCount,
        logprobs: result.logprobs
      },
      message: `Chat response from **${result.model}**: "${contentPreview}"${toolCallInfo}`
    };
  })
  .build();
