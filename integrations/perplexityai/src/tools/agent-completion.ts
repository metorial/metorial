import { SlateTool } from 'slates';
import { z } from 'zod';
import type { AgentOutputItem, AgentTool } from '../lib/client';
import { PerplexityClient } from '../lib/client';
import { perplexityServiceError } from '../lib/errors';
import { spec } from '../spec';

let extractOutputText = (output: AgentOutputItem[]) =>
  output
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

let extractSearchResults = (output: AgentOutputItem[]) =>
  output
    .filter(item => item.type === 'search_results' && Array.isArray(item.results))
    .flatMap(item => item.results ?? [])
    .map(result => ({
      title: result.title,
      url: result.url,
      date: result.date ?? undefined,
      snippet: result.snippet ?? undefined,
      source: result.source ?? undefined,
      lastUpdated: result.last_updated ?? undefined
    }));

let extractCitations = (output: AgentOutputItem[]) => {
  let urls = new Set<string>();

  for (let item of output) {
    if (item.type === 'search_results' && Array.isArray(item.results)) {
      for (let result of item.results) {
        if (typeof result.url === 'string') urls.add(result.url);
      }
    }

    if (item.type === 'fetch_url_results' && Array.isArray(item.contents)) {
      for (let content of item.contents) {
        if (typeof content.url === 'string') urls.add(content.url);
      }
    }
  }

  return Array.from(urls);
};

let buildResponseFormat = (
  responseFormat: 'text' | 'json_schema' | undefined,
  jsonSchema: Record<string, unknown> | undefined
) => {
  if (responseFormat !== 'json_schema' && jsonSchema !== undefined) {
    throw perplexityServiceError(
      'jsonSchema can only be used with responseFormat "json_schema".'
    );
  }

  if (responseFormat === 'json_schema') {
    if (!jsonSchema || Object.keys(jsonSchema).length === 0) {
      throw perplexityServiceError(
        'jsonSchema is required when responseFormat is "json_schema".'
      );
    }

    return {
      type: 'json_schema' as const,
      json_schema: jsonSchema
    };
  }

  if (responseFormat === 'text') {
    return { type: 'text' as const };
  }

  return undefined;
};

let validateMaxOutputTokens = (
  maxOutputTokens: number | undefined,
  maxTokens: number | undefined
) => {
  if (
    maxOutputTokens !== undefined &&
    maxTokens !== undefined &&
    maxOutputTokens !== maxTokens
  ) {
    throw perplexityServiceError('Use only one of maxOutputTokens or maxTokens.');
  }

  return maxOutputTokens ?? maxTokens;
};

export let agentCompletion = SlateTool.create(spec, {
  name: 'Agent Completion',
  key: 'agent_completion',
  description: `Execute agentic AI workflows through Perplexity's Agent API, which provides unified access to models from OpenAI, Anthropic, Google, xAI, NVIDIA, and Perplexity through a single request.

Supports built-in tools (web search, URL fetching, finance search, people search, and sandbox), model fallback chains, and pre-configured **presets** for common use cases:
- **fast-search** - Quick factual lookups
- **pro-search** - Balanced research
- **deep-research** - Multi-source analysis
- **advanced-deep-research** - Expert-level research

You can use presets as-is or override supported parameters. Models use the \`provider/model-name\` format; use list_agent_models to discover the current model IDs.`,
  instructions: [
    'Use a preset for common workflows - they are pre-optimized with the right model, tools, and settings.',
    'Specify multiple models in the models array for automatic failover if one is unavailable.',
    'Use maxSteps to cap built-in tool calls and maxOutputTokens to control response length.',
    'Use financeSearch or peopleSearch only for prompts where those specialized tools are relevant.'
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
      enableFinanceSearch: z
        .boolean()
        .optional()
        .describe('Enable structured financial and market data search'),
      enablePeopleSearch: z
        .boolean()
        .optional()
        .describe('Enable professional people search for legitimate research workflows'),
      enableSandbox: z
        .boolean()
        .optional()
        .describe(
          'Enable the Perplexity sandbox tool for code execution inside the Agent API'
        ),
      webSearchContextSize: z
        .enum(['low', 'medium', 'high'])
        .optional()
        .describe('Context size for the web_search tool'),
      searchToolMaxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Max tokens for web_search and people_search tool results'),
      searchToolMaxTokensPerPage: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Max tokens per page for web_search and people_search tool results'),
      maxOutputTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum output tokens in the Agent API response'),
      maxTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Deprecated alias for maxOutputTokens'),
      maxSteps: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum built-in tool-call steps the Agent API may take'),
      temperature: z.number().min(0).max(2).optional().describe('Controls randomness (0-2)'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter (0-1)'),
      reasoningEffort: z
        .enum(['minimal', 'low', 'medium', 'high'])
        .optional()
        .describe('Reasoning depth for supported models'),
      reasoningBudgetTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Max tokens for reasoning steps'),
      responseFormat: z
        .enum(['text', 'json_schema'])
        .optional()
        .describe('Output format. json_schema requires jsonSchema.'),
      jsonSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON Schema object used when responseFormat is json_schema')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('Unique identifier for this agent response'),
      model: z.string().optional().describe('Model that was used'),
      status: z.string().optional().describe('Response status'),
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
            snippet: z.string().optional(),
            source: z.string().optional(),
            lastUpdated: z.string().optional()
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

    let tools: AgentTool[] = [];
    if (ctx.input.enableWebSearch) {
      tools.push({
        type: 'web_search',
        search_context_size: ctx.input.webSearchContextSize,
        max_tokens: ctx.input.searchToolMaxTokens,
        max_tokens_per_page: ctx.input.searchToolMaxTokensPerPage
      });
    }
    if (ctx.input.enableUrlFetch) {
      tools.push({ type: 'fetch_url' });
    }
    if (ctx.input.enableFinanceSearch) {
      tools.push({ type: 'finance_search' });
    }
    if (ctx.input.enablePeopleSearch) {
      tools.push({
        type: 'people_search',
        max_tokens: ctx.input.searchToolMaxTokens,
        max_tokens_per_page: ctx.input.searchToolMaxTokensPerPage
      });
    }
    if (ctx.input.enableSandbox) {
      tools.push({ type: 'sandbox' });
    }

    let reasoning =
      ctx.input.reasoningEffort || ctx.input.reasoningBudgetTokens
        ? {
            effort: ctx.input.reasoningEffort,
            budget_tokens: ctx.input.reasoningBudgetTokens
          }
        : undefined;
    let maxOutputTokens = validateMaxOutputTokens(
      ctx.input.maxOutputTokens,
      ctx.input.maxTokens
    );

    let response = await client.agentCompletion({
      input: ctx.input.input,
      model: ctx.input.model,
      models: ctx.input.models,
      preset: ctx.input.preset,
      instructions: ctx.input.instructions,
      tools: tools.length > 0 ? tools : undefined,
      max_output_tokens: maxOutputTokens,
      max_steps: ctx.input.maxSteps,
      temperature: ctx.input.temperature,
      top_p: ctx.input.topP,
      reasoning,
      response_format: buildResponseFormat(ctx.input.responseFormat, ctx.input.jsonSchema),
      stream: false
    });

    if (response.error) {
      throw perplexityServiceError(
        `Perplexity Agent response failed: ${response.error.message ?? response.error.code ?? 'unknown error'}`
      );
    }

    let textContent = extractOutputText(response.output);
    let citations = extractCitations(response.output);
    let searchResults = extractSearchResults(response.output);

    let contentPreview = textContent.substring(0, 200);

    return {
      output: {
        responseId: response.id,
        model: response.model,
        status: response.status,
        content: textContent,
        output: response.output as Record<string, unknown>[],
        citations: citations.length > 0 ? citations : undefined,
        searchResults: searchResults.length > 0 ? searchResults : undefined,
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        totalTokens: response.usage?.total_tokens
      },
      message: `Agent response generated${response.model ? ` using **${response.model}**` : ''}${response.usage ? ` (${response.usage.total_tokens} tokens)` : ''}. Preview: "${contentPreview}${textContent.length > 200 ? '...' : ''}"`
    };
  })
  .build();
