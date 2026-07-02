import { SlateTool } from 'slates';
import { z } from 'zod';
import { CohereClient } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']).describe('Role of the message sender'),
  content: z.string().describe('Text content of the message')
});

let toolDefinitionSchema = z.object({
  type: z.literal('function').describe('Tool type, must be "function"'),
  function: z.object({
    name: z.string().describe('Name of the function'),
    description: z.string().optional().describe('Description of what the function does'),
    parameters: z
      .record(z.string(), z.any())
      .optional()
      .describe('JSON Schema describing the function parameters')
  })
});

let documentSchema = z.object({
  id: z.string().optional().describe('Unique identifier for the document'),
  data: z.record(z.string(), z.string()).describe('Key-value pairs of document content')
});

export let chatTool = SlateTool.create(spec, {
  name: 'Chat',
  key: 'chat',
  description: `Generate text responses using Cohere's Command family of models. Supports multi-turn conversations with system prompts, tool use for calling external APIs, and retrieval augmented generation (RAG) with inline citations. Can be configured for reasoning tasks with adjustable thinking budgets.`,
  instructions: [
    'Use the "messages" array to provide conversation history. Include a system message for custom behavior.',
    'For RAG, pass documents in the "documents" field — the model will generate inline citations automatically.',
    'For tool use, define tools in the "tools" field. The model may respond with tool calls that need to be executed externally.'
  ],
  constraints: [
    'The model parameter must be a valid Cohere chat model (e.g., "command-a-03-2025", "command-r-plus-08-2024").',
    'Temperature ranges from 0 to 2. Max tokens depends on the model used.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Cohere model to use (e.g., "command-a-03-2025", "command-r-plus-08-2024", "command-r7b-12-2024")'
        ),
      messages: z
        .array(messageSchema)
        .describe('Conversation messages in chronological order'),
      temperature: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .describe('Controls randomness of output (0 = deterministic, 2 = very random)'),
      maxTokens: z.number().optional().describe('Maximum number of tokens to generate'),
      stopSequences: z
        .array(z.string())
        .optional()
        .describe('Sequences that will stop generation when encountered'),
      frequencyPenalty: z
        .number()
        .optional()
        .describe('Penalizes repeated tokens based on frequency (0 to 1)'),
      presencePenalty: z
        .number()
        .optional()
        .describe('Penalizes tokens that have already appeared (0 to 1)'),
      seed: z.number().optional().describe('Fixed seed for reproducible outputs'),
      safetyMode: z
        .enum(['CONTEXTUAL', 'STRICT', 'OFF'])
        .optional()
        .describe('Safety filtering level for generated content'),
      tools: z
        .array(toolDefinitionSchema)
        .optional()
        .describe('Function definitions the model can invoke'),
      documents: z
        .array(documentSchema)
        .optional()
        .describe(
          'Documents for RAG — the model will ground its response and generate citations'
        ),
      enableThinking: z
        .boolean()
        .optional()
        .describe('Enable reasoning/thinking mode for complex tasks'),
      thinkingBudget: z
        .number()
        .optional()
        .describe('Maximum number of tokens for the thinking/reasoning process')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('Unique identifier for this response'),
      finishReason: z
        .string()
        .describe('Reason the generation stopped (COMPLETE, MAX_TOKENS, TOOL_CALL, etc.)'),
      text: z.string().optional().describe('Generated text content'),
      toolCalls: z
        .array(
          z.object({
            callId: z.string().describe('Unique identifier for this tool call'),
            name: z.string().describe('Name of the tool to invoke'),
            arguments: z.string().describe('JSON string of arguments to pass to the tool')
          })
        )
        .optional()
        .describe('Tool calls requested by the model'),
      citations: z
        .array(z.any())
        .optional()
        .describe('Inline citations referencing provided documents'),
      inputTokens: z.number().optional().describe('Number of input tokens consumed'),
      outputTokens: z.number().optional().describe('Number of output tokens generated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let thinking: Record<string, any> | undefined;
    if (ctx.input.enableThinking !== undefined) {
      thinking = { enabled: ctx.input.enableThinking };
      if (ctx.input.thinkingBudget !== undefined) {
        thinking.budget_tokens = ctx.input.thinkingBudget;
      }
    }

    let result = await client.chat({
      model: ctx.input.model,
      messages: ctx.input.messages,
      temperature: ctx.input.temperature,
      maxTokens: ctx.input.maxTokens,
      stopSequences: ctx.input.stopSequences,
      frequencyPenalty: ctx.input.frequencyPenalty,
      presencePenalty: ctx.input.presencePenalty,
      seed: ctx.input.seed,
      safetyMode: ctx.input.safetyMode,
      tools: ctx.input.tools,
      documents: ctx.input.documents,
      thinking
    });

    let text: string | undefined;
    let toolCalls: Array<{ callId: string; name: string; arguments: string }> | undefined;
    let citations: any[] | undefined;

    if (result.message) {
      if (result.message.content && Array.isArray(result.message.content)) {
        let textParts = result.message.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text);
        if (textParts.length > 0) {
          text = textParts.join('');
        }
      } else if (typeof result.message.content === 'string') {
        text = result.message.content;
      }

      if (result.message.tool_calls && result.message.tool_calls.length > 0) {
        toolCalls = result.message.tool_calls.map((tc: any) => ({
          callId: tc.id || '',
          name: tc.function?.name || tc.name || '',
          arguments:
            typeof tc.function?.arguments === 'string'
              ? tc.function.arguments
              : JSON.stringify(tc.function?.arguments || tc.parameters || {})
        }));
      }

      if (result.message.citations && result.message.citations.length > 0) {
        citations = result.message.citations;
      }
    }

    let inputTokens = result.usage?.tokens?.input_tokens;
    let outputTokens = result.usage?.tokens?.output_tokens;

    let output = {
      responseId: result.id || '',
      finishReason: result.finish_reason || 'COMPLETE',
      text,
      toolCalls,
      citations,
      inputTokens,
      outputTokens
    };

    let messageSummary = text
      ? `Generated ${text.length} characters of text`
      : toolCalls
        ? `Model requested ${toolCalls.length} tool call(s)`
        : 'Response generated';

    return {
      output,
      message: `${messageSummary} using **${ctx.input.model}**. Finish reason: ${output.finishReason}.`
    };
  })
  .build();
