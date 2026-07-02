import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']).describe('Role of the message sender'),
  content: z.string().optional().describe('Text content of the message'),
  toolCallId: z
    .string()
    .optional()
    .describe('ID of the tool call this message responds to (for tool role)')
});

let toolDefinitionSchema = z.object({
  type: z.literal('function').describe('Tool type'),
  function: z.object({
    name: z.string().describe('Function name'),
    description: z.string().optional().describe('Description of the function'),
    parameters: z
      .record(z.string(), z.any())
      .optional()
      .describe('JSON Schema for function parameters')
  })
});

let documentSchema = z.object({
  content: z.string().describe('Document content'),
  metadata: z
    .record(z.string(), z.string())
    .optional()
    .describe('Key-value metadata for the document')
});

export let chatCompletion = SlateTool.create(spec, {
  name: 'Chat Completion',
  key: 'chat_completion',
  description: `Generate a chat completion using AI21's Jamba models. Supports multi-turn conversations with system, user, assistant, and tool messages. Optionally enable JSON mode, pass documents for context, or define tools for function calling.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      model: z.enum(['jamba-large', 'jamba-mini']).describe('Jamba model to use'),
      messages: z.array(messageSchema).describe('Conversation messages'),
      maxTokens: z
        .number()
        .int()
        .optional()
        .describe('Maximum number of tokens to generate (up to 4096)'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Sampling temperature (0.0-2.0). Higher values increase randomness'),
      topP: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Nucleus sampling threshold (0.0-1.0)'),
      stop: z
        .array(z.string())
        .optional()
        .describe('Stop sequences that terminate generation'),
      n: z
        .number()
        .int()
        .min(1)
        .max(16)
        .optional()
        .describe('Number of completions to generate (1-16)'),
      tools: z
        .array(toolDefinitionSchema)
        .optional()
        .describe('Tool/function definitions for function calling'),
      documents: z
        .array(documentSchema)
        .optional()
        .describe('Context documents to ground the response'),
      responseFormat: z
        .object({
          type: z.enum(['text', 'json_object']).describe('Response format type')
        })
        .optional()
        .describe('Set to json_object to enable JSON mode')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      choices: z
        .array(
          z.object({
            index: z.number().describe('Choice index'),
            message: z
              .object({
                role: z.string().describe('Message role'),
                content: z.string().optional().describe('Generated text content'),
                toolCalls: z
                  .array(
                    z.object({
                      toolCallId: z.string().describe('Tool call identifier'),
                      type: z.string().describe('Tool call type'),
                      function: z.object({
                        name: z.string().describe('Function name'),
                        arguments: z.string().describe('Serialized function arguments')
                      })
                    })
                  )
                  .optional()
                  .describe('Tool calls requested by the model')
              })
              .describe('Generated message'),
            finishReason: z.string().optional().describe('Reason generation stopped')
          })
        )
        .describe('List of completion choices'),
      usage: z
        .object({
          promptTokens: z.number().describe('Number of prompt tokens'),
          completionTokens: z.number().describe('Number of completion tokens'),
          totalTokens: z.number().describe('Total tokens used')
        })
        .describe('Token usage information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.chatCompletion({
      model: ctx.input.model,
      messages: ctx.input.messages,
      maxTokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      stop: ctx.input.stop,
      n: ctx.input.n,
      tools: ctx.input.tools,
      documents: ctx.input.documents,
      responseFormat: ctx.input.responseFormat
    });

    let choices = (result.choices || []).map((c: any) => ({
      index: c.index,
      message: {
        role: c.message?.role,
        content: c.message?.content ?? undefined,
        toolCalls: c.message?.tool_calls?.map((tc: any) => ({
          toolCallId: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }))
      },
      finishReason: c.finish_reason
    }));

    let output = {
      completionId: result.id,
      choices,
      usage: {
        promptTokens: result.usage?.prompt_tokens ?? 0,
        completionTokens: result.usage?.completion_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0
      }
    };

    let firstContent = choices[0]?.message?.content;
    let preview = firstContent
      ? firstContent.substring(0, 200) + (firstContent.length > 200 ? '...' : '')
      : 'No text content generated';

    return {
      output,
      message: `Generated **${choices.length}** completion(s) using **${ctx.input.model}**. Used ${output.usage.totalTokens} tokens.\n\n> ${preview}`
    };
  })
  .build();
