import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerplexityClient } from '../lib/client';
import { spec } from '../spec';

export let agentCompletion = SlateTool.create(spec, {
  name: 'Agent Completion',
  key: 'agent_completion',
  description: `Execute agentic AI workflows through Perplexity's Agent API, which provides unified access to models from OpenAI, Anthropic, Google, xAI, NVIDIA, and Perplexity through a single request.

Supports built-in tools (web search, URL fetching), model fallback chains, and pre-configured **presets** for common use cases:
- **fast-search** - Quick factual lookups (xAI Grok, 1 step)
- **pro-search** - Balanced research (GPT-5.1, 3 steps)
- **deep-research** - Multi-source analysis (GPT-5.2, 10 steps)
- **advanced-deep-research** - Expert research (Claude Opus, 10 steps)

You can use presets as-is or override any parameter. Models use the \`provider/model-name\` format (e.g., \`openai/gpt-5.4\`, \`anthropic/claude-sonnet-4-6\`).`,
  instructions: [
    'Use a preset for common workflows - they are pre-optimized with the right model, tools, and settings.',
    'Specify multiple models in the models array for automatic failover if one is unavailable.',
    'When using a preset, you can override individual parameters like maxTokens or instructions.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      input: z.string().describe('The user query or objective for the agent'),
      model: z
        .string()
        .optional()
        .describe(
          'Model to use in provider/model-name format (e.g., "openai/gpt-5.4", "anthropic/claude-sonnet-4-6", "perplexity/sonar")'
        ),
      models: z
        .array(z.string())
        .optional()
        .describe(
          'Fallback chain of models (up to 5). Tries each in order until one succeeds.'
        ),
      preset: z
        .enum(['fast-search', 'pro-search', 'deep-research', 'advanced-deep-research'])
        .optional()
        .describe('Pre-configured preset optimized for a specific use case'),
      instructions: z
        .string()
        .optional()
        .describe('System instructions to guide the agent behavior'),
      enableWebSearch: z
        .boolean()
        .optional()
        .describe('Enable the web search tool for real-time information'),
      enableUrlFetch: z
        .boolean()
        .optional()
        .describe('Enable the URL fetch tool for reading specific pages'),
      maxTokens: z.number().optional().describe('Maximum tokens in the response'),
      temperature: z.number().min(0).max(2).optional().describe('Controls randomness (0-2)'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter (0-1)'),
      reasoningEffort: z
        .enum(['minimal', 'low', 'medium', 'high'])
        .optional()
        .describe('Reasoning depth for supported models'),
      reasoningBudgetTokens: z.number().optional().describe('Max tokens for reasoning steps'),
      responseFormat: z.enum(['text', 'json_object']).optional().describe('Output format')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('Unique identifier for this agent response'),
      model: z.string().optional().describe('Model that was used'),
      content: z.string().describe('Generated response text'),
      output: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Full structured output items from the agent'),
      citations: z.array(z.string()).optional().describe('Source URLs referenced'),
      searchResults: z
        .array(
          z.object({
            title: z.string(),
            url: z.string(),
            date: z.string().optional(),
            snippet: z.string().optional()
          })
        )
        .optional()
        .describe('Search results used as context'),
      inputTokens: z.number().optional().describe('Tokens used in the input'),
      outputTokens: z.number().optional().describe('Tokens used in the output'),
      totalTokens: z.number().optional().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerplexityClient(ctx.auth.token);

    let tools: Array<{ type: string }> = [];
    if (ctx.input.enableWebSearch) {
      tools.push({ type: 'web_search' });
    }
    if (ctx.input.enableUrlFetch) {
      tools.push({ type: 'fetch_url' });
    }

    let reasoning =
      ctx.input.reasoningEffort || ctx.input.reasoningBudgetTokens
        ? {
            effort: ctx.input.reasoningEffort,
            budget_tokens: ctx.input.reasoningBudgetTokens
          }
        : undefined;

    let response = await client.agentCompletion({
      input: ctx.input.input,
      model: ctx.input.model,
      models: ctx.input.models,
      preset: ctx.input.preset,
      instructions: ctx.input.instructions,
      tools: tools.length > 0 ? (tools as any) : undefined,
      max_tokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      top_p: ctx.input.topP,
      reasoning,
      response_format: ctx.input.responseFormat
        ? { type: ctx.input.responseFormat }
        : undefined,
      stream: false
    });

    // Extract text content from output items
    let textContent = response.output
      .filter(item => item.type === 'message')
      .map(item => {
        if (typeof item.content === 'string') return item.content;
        if (Array.isArray(item.content)) {
          return item.content
            .filter(c => c.type === 'output_text' || c.type === 'text')
            .map(c => c.text ?? '')
            .join('');
        }
        return '';
      })
      .join('\n')
      .trim();

    let contentPreview = textContent.substring(0, 200);

    return {
      output: {
        responseId: response.id,
        model: response.model,
        content: textContent,
        output: response.output as Record<string, unknown>[],
        citations: response.citations,
        searchResults: response.search_results,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        totalTokens: response.usage?.total_tokens
      },
      message: `Agent response generated${response.model ? ` using **${response.model}**` : ''}${response.usage ? ` (${response.usage.total_tokens} tokens)` : ''}. Preview: "${contentPreview}${textContent.length > 200 ? '...' : ''}"`
    };
  })
  .build();
