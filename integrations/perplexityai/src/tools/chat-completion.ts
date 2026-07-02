import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerplexityClient } from '../lib/client';
import { spec } from '../spec';

export let chatCompletion = SlateTool.create(spec, {
  name: 'Sonar Chat Completion',
  key: 'chat_completion',
  description: `Generate AI responses grounded in real-time web search using Perplexity's Sonar models. Responses include inline citations to web sources, making it ideal for factual queries, research summaries, and question answering.

Available models:
- **sonar** - Lightweight, fast search model for quick queries
- **sonar-pro** - Advanced model with multi-step queries and ~2x more citations
- **sonar-reasoning-pro** - Chain-of-thought reasoning for complex analysis
- **sonar-deep-research** - Expert-level exhaustive research and reports

Supports search filters (domain, recency, language), structured JSON output, and optional image/related question retrieval.`,
  instructions: [
    'Use "sonar" for simple factual lookups and "sonar-pro" for deeper research requiring more citations.',
    'Set disableSearch to true to use the model without web search (training data only).',
    'Date filters use MM/DD/YYYY format (e.g., "03/01/2025").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .enum(['sonar', 'sonar-pro', 'sonar-reasoning-pro', 'sonar-deep-research'])
        .default('sonar')
        .describe('Sonar model to use'),
      messages: z
        .array(
          z.object({
            role: z
              .enum(['system', 'user', 'assistant'])
              .describe('Role of the message sender'),
            content: z.string().describe('Message content')
          })
        )
        .describe('Conversation messages'),
      maxTokens: z
        .number()
        .optional()
        .describe('Maximum tokens in the response (up to 128000)'),
      temperature: z.number().min(0).max(2).optional().describe('Controls randomness (0-2)'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter (0-1)'),
      frequencyPenalty: z.number().optional().describe('Penalizes repeated tokens'),
      presencePenalty: z.number().optional().describe('Penalizes tokens based on presence'),
      searchRecencyFilter: z
        .enum(['hour', 'day', 'week', 'month', 'year'])
        .optional()
        .describe('Filter search results by recency'),
      searchDomainFilter: z
        .array(z.string())
        .optional()
        .describe('Restrict search to specific domains (prefix with - to exclude)'),
      searchLanguageFilter: z
        .array(z.string())
        .optional()
        .describe('Filter by language (ISO 639-1 codes)'),
      searchAfterDate: z
        .string()
        .optional()
        .describe('Only return sources published after this date (MM/DD/YYYY)'),
      searchBeforeDate: z
        .string()
        .optional()
        .describe('Only return sources published before this date (MM/DD/YYYY)'),
      searchMode: z
        .enum(['web', 'academic', 'sec'])
        .optional()
        .describe('Type of search to perform'),
      returnImages: z.boolean().optional().describe('Include images in the response'),
      returnRelatedQuestions: z
        .boolean()
        .optional()
        .describe('Include related follow-up questions'),
      disableSearch: z
        .boolean()
        .optional()
        .describe('Disable web search, use training data only'),
      reasoningEffort: z
        .enum(['minimal', 'low', 'medium', 'high'])
        .optional()
        .describe('Reasoning depth (for reasoning models)'),
      responseFormat: z.enum(['text', 'json_object']).optional().describe('Output format')
    })
  )
  .output(
    z.object({
      completionId: z.string().describe('Unique identifier for this completion'),
      model: z.string().describe('Model used for generation'),
      content: z.string().describe('Generated response text'),
      finishReason: z.string().describe('Reason generation stopped'),
      citations: z
        .array(z.string())
        .optional()
        .describe('Source URLs referenced in the response'),
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
      images: z
        .array(
          z.object({
            imageUrl: z.string(),
            originUrl: z.string(),
            height: z.number().optional(),
            width: z.number().optional()
          })
        )
        .optional()
        .describe('Images found during search'),
      relatedQuestions: z
        .array(z.string())
        .optional()
        .describe('Suggested follow-up questions'),
      promptTokens: z.number().describe('Tokens used in the prompt'),
      completionTokens: z.number().describe('Tokens used in the response'),
      totalTokens: z.number().describe('Total tokens used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerplexityClient(ctx.auth.token);

    let response = await client.chatCompletion({
      model: ctx.input.model,
      messages: ctx.input.messages,
      max_tokens: ctx.input.maxTokens,
      temperature: ctx.input.temperature,
      top_p: ctx.input.topP,
      frequency_penalty: ctx.input.frequencyPenalty,
      presence_penalty: ctx.input.presencePenalty,
      search_recency_filter: ctx.input.searchRecencyFilter,
      search_domain_filter: ctx.input.searchDomainFilter,
      search_language_filter: ctx.input.searchLanguageFilter,
      search_after_date_filter: ctx.input.searchAfterDate,
      search_before_date_filter: ctx.input.searchBeforeDate,
      search_mode: ctx.input.searchMode,
      return_images: ctx.input.returnImages,
      return_related_questions: ctx.input.returnRelatedQuestions,
      disable_search: ctx.input.disableSearch,
      reasoning_effort: ctx.input.reasoningEffort,
      response_format: ctx.input.responseFormat
        ? { type: ctx.input.responseFormat }
        : undefined,
      stream: false
    });

    let choice = response.choices[0];
    if (!choice) {
      throw new Error('No completion choice returned');
    }

    let contentPreview = choice.message.content.substring(0, 200);
    let citationCount = response.citations?.length ?? 0;

    return {
      output: {
        completionId: response.id,
        model: response.model,
        content: choice.message.content,
        finishReason: choice.finish_reason,
        citations: response.citations,
        searchResults: response.search_results,
        images: response.images,
        relatedQuestions: response.related_questions,
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      },
      message: `Generated response using **${response.model}** (${response.usage.total_tokens} tokens, ${citationCount} citations). Preview: "${contentPreview}${choice.message.content.length > 200 ? '...' : ''}"`
    };
  })
  .build();
