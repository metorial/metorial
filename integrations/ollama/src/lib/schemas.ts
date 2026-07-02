import { z } from 'zod';

export let modelOptionsSchema = z
  .object({
    temperature: z
      .number()
      .min(0)
      .max(2)
      .optional()
      .describe(
        'Controls randomness. Higher values make output more random, lower values more deterministic.'
      ),
    topK: z
      .number()
      .optional()
      .describe('Limits token selection to the top K most likely tokens.'),
    topP: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Limits token selection to a cumulative probability threshold.'),
    seed: z.number().optional().describe('Random seed for reproducible generation.'),
    numCtx: z.number().optional().describe('Context window size in tokens.'),
    numPredict: z
      .number()
      .optional()
      .describe('Maximum number of tokens to generate. -1 for infinite.'),
    stop: z.array(z.string()).optional().describe('Stop sequences that halt generation.'),
    repeatPenalty: z.number().optional().describe('Penalty for repeating tokens.'),
    presencePenalty: z
      .number()
      .optional()
      .describe('Penalty for tokens that have appeared at all.'),
    frequencyPenalty: z
      .number()
      .optional()
      .describe('Penalty proportional to how often a token has appeared.'),
    minP: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Minimum probability threshold for token selection.')
  })
  .optional()
  .describe('Model generation parameters.');

export let thinkSchema = z
  .union([z.boolean(), z.enum(['high', 'medium', 'low'])])
  .optional()
  .describe(
    'Enable thinking output. Use true or one of "high", "medium", or "low" for supported models.'
  );

export let keepAliveSchema = z
  .union([z.string(), z.number()])
  .optional()
  .describe('Model keep-alive duration, such as "5m", "1h", or 0 to unload immediately.');

export let logprobSchema = z
  .object({
    token: z.string().describe('Generated token.'),
    logprob: z.number().describe('Log probability for the generated token.'),
    bytes: z.array(z.number()).optional().describe('Token byte values.'),
    topLogprobs: z
      .array(
        z.object({
          token: z.string().describe('Alternative token.'),
          logprob: z.number().describe('Log probability for the alternative token.'),
          bytes: z.array(z.number()).optional().describe('Alternative token byte values.')
        })
      )
      .optional()
      .describe('Most likely alternative tokens for this token position.')
  })
  .describe('Log probability information for one generated token.');

export let modelDetailsSchema = z
  .object({
    parentModel: z.string().optional().describe('Parent model this model was derived from.'),
    format: z.string().optional().describe('Model file format (e.g., gguf).'),
    family: z.string().optional().describe('Model architecture family (e.g., llama, gemma).'),
    families: z.array(z.string()).optional().describe('All applicable model families.'),
    parameterSize: z
      .string()
      .optional()
      .describe('Approximate parameter count (e.g., "7B", "13B").'),
    quantizationLevel: z.string().optional().describe('Quantization level (e.g., "Q4_K_M").')
  })
  .describe('Model details and specifications.');

export let modelInfoSchema = z
  .object({
    name: z.string().describe('Full model name including tag.'),
    model: z.string().describe('Model identifier.'),
    modifiedAt: z
      .string()
      .optional()
      .describe('ISO 8601 timestamp of last modification, when returned by Ollama.'),
    size: z.number().describe('Model size in bytes.'),
    digest: z.string().describe('SHA256 digest of the model.'),
    details: modelDetailsSchema
  })
  .describe('Model information.');

export let chatMessageSchema = z
  .object({
    role: z
      .enum(['system', 'user', 'assistant', 'tool'])
      .describe('The role of the message sender.'),
    content: z.string().describe('The text content of the message.'),
    images: z
      .array(z.string())
      .optional()
      .describe('Base64-encoded images for vision-capable models.'),
    toolCalls: z
      .array(
        z.object({
          function: z.object({
            name: z.string().describe('Name of the tool function.'),
            arguments: z
              .record(z.string(), z.unknown())
              .describe('Arguments to pass to the tool function.')
          })
        })
      )
      .optional()
      .describe('Tool calls requested by the model.')
  })
  .describe('A single message in the conversation.');

export let toolDefinitionSchema = z
  .object({
    type: z.literal('function').describe('Tool type, always "function".'),
    function: z.object({
      name: z.string().describe('Name of the function.'),
      description: z.string().describe('Description of what the function does.'),
      parameters: z
        .record(z.string(), z.unknown())
        .describe('JSON Schema defining the function parameters.')
    })
  })
  .describe('A tool definition for function calling.');

export let createModelMessageSchema = z
  .object({
    role: z
      .enum(['system', 'user', 'assistant'])
      .describe('Role for a message included in the model template history.'),
    content: z.string().describe('Message content.')
  })
  .describe('A message to bake into the created model.');
