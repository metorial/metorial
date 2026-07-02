import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let callPrompt = SlateTool.create(spec, {
  name: 'Call Prompt',
  key: 'call_prompt',
  description: `Call a prompt through Humanloop's LLM proxy, which forwards the request to the model provider and automatically logs the result. Supports specifying input variables, messages, and provider API keys. Returns the model's generated output along with usage metadata.`,
  instructions: [
    'Provide either a promptId or a path to identify which prompt to call.',
    'Input variables correspond to {{variable}} placeholders in the prompt template.',
    'Provider API keys can be passed if not configured on the Humanloop organization.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      promptId: z.string().optional().describe('ID of the prompt to call'),
      path: z.string().optional().describe('Path of the prompt to call'),
      versionId: z.string().optional().describe('Specific version ID to call'),
      inputs: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Input variables to populate the template (key-value pairs matching {{variable}} placeholders)'
        ),
      messages: z
        .array(
          z.object({
            role: z
              .enum(['system', 'user', 'assistant', 'tool'])
              .describe('Role of the message sender'),
            content: z.string().describe('Content of the message'),
            name: z.string().optional().describe('Name of the sender')
          })
        )
        .optional()
        .describe('Additional messages to append to the conversation'),
      providerApiKeys: z
        .record(z.string(), z.string())
        .optional()
        .describe('Provider API keys (e.g. {"openai": "sk-...", "anthropic": "sk-ant-..."})'),
      numSamples: z.number().optional().describe('Number of samples to generate'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional metadata to attach to the log')
    })
  )
  .output(
    z.object({
      logId: z.string().optional().describe('ID of the generated log'),
      output: z.string().optional().describe('Generated text output'),
      outputMessage: z.any().optional().describe('Full output message object'),
      finishReason: z.string().optional().describe('Reason the model stopped generating'),
      usage: z.any().optional().describe('Token usage information'),
      raw: z.any().optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      stream: false
    };

    if (ctx.input.promptId) body.id = ctx.input.promptId;
    if (ctx.input.path) body.path = ctx.input.path;
    if (ctx.input.versionId) body.version_id = ctx.input.versionId;
    if (ctx.input.inputs) body.inputs = ctx.input.inputs;
    if (ctx.input.messages) body.messages = ctx.input.messages;
    if (ctx.input.providerApiKeys) body.provider_api_keys = ctx.input.providerApiKeys;
    if (ctx.input.numSamples) body.num_samples = ctx.input.numSamples;
    if (ctx.input.metadata) body.metadata = ctx.input.metadata;
    if (ctx.config.environment) body.environment = ctx.config.environment;

    let result = await client.callPrompt(body);

    let outputText = result?.output_message?.content || result?.output || '';
    let logId = result?.id || result?.log_id;

    return {
      output: {
        logId,
        output: typeof outputText === 'string' ? outputText : JSON.stringify(outputText),
        outputMessage: result?.output_message,
        finishReason: result?.finish_reason,
        usage: result?.usage,
        raw: result
      },
      message: `Called prompt and received response${logId ? ` (log: ${logId})` : ''}. Output: ${typeof outputText === 'string' ? outputText.substring(0, 200) : 'see raw response'}${typeof outputText === 'string' && outputText.length > 200 ? '...' : ''}`
    };
  })
  .build();
