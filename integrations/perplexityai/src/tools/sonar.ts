import { z } from 'zod';
import type { ChatCompletionRequest } from '../lib/client';
import { perplexityServiceError } from '../lib/errors';

export let sonarInputSchema = z.object({
  model: z
    .enum(['sonar', 'sonar-pro', 'sonar-reasoning-pro', 'sonar-deep-research'])
    .default('sonar')
    .describe('Sonar model to use'),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']).describe('Role of the message sender'),
        content: z.string().describe('Message content')
      })
    )
    .min(1)
    .describe('Conversation messages'),
  maxTokens: z
    .number()
    .int()
    .positive()
    .max(128000)
    .optional()
    .describe('Maximum completion tokens to generate'),
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
    .max(20)
    .optional()
    .describe('Restrict search to specific domains or exclude with a leading "-"'),
  searchLanguageFilter: z
    .array(z.string())
    .max(20)
    .optional()
    .describe('Filter by language using ISO 639-1 codes'),
  searchAfterDate: z
    .string()
    .optional()
    .describe('Only return sources published after this date (MM/DD/YYYY)'),
  searchBeforeDate: z
    .string()
    .optional()
    .describe('Only return sources published before this date (MM/DD/YYYY)'),
  lastUpdatedAfter: z
    .string()
    .optional()
    .describe('Only return sources last updated after this date (MM/DD/YYYY)'),
  lastUpdatedBefore: z
    .string()
    .optional()
    .describe('Only return sources last updated before this date (MM/DD/YYYY)'),
  searchMode: z.enum(['web', 'academic', 'sec']).optional().describe('Search source type'),
  searchContextSize: z
    .enum(['low', 'medium', 'high'])
    .optional()
    .describe('Amount of web context to retrieve for Sonar search'),
  imageFormatFilter: z
    .array(z.string())
    .optional()
    .describe('Filter returned images by format such as png, jpg, or webp'),
  imageDomainFilter: z
    .array(z.string())
    .optional()
    .describe('Limit returned images to specific domains'),
  returnImages: z.boolean().optional().describe('Include images in the response'),
  returnRelatedQuestions: z
    .boolean()
    .optional()
    .describe('Include related follow-up questions'),
  disableSearch: z
    .boolean()
    .optional()
    .describe('Disable web search and answer from model context only'),
  enableSearchClassifier: z
    .boolean()
    .optional()
    .describe('Let Perplexity decide whether web search is needed'),
  reasoningEffort: z
    .enum(['minimal', 'low', 'medium', 'high'])
    .optional()
    .describe('Reasoning depth for reasoning models'),
  responseFormat: z
    .enum(['text', 'json_schema'])
    .optional()
    .describe('Output format. json_schema requires jsonSchema.'),
  jsonSchema: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('JSON Schema object used when responseFormat is json_schema')
});

export type SonarInput = z.infer<typeof sonarInputSchema>;

let buildResponseFormat = (input: SonarInput) => {
  if (input.responseFormat !== 'json_schema' && input.jsonSchema !== undefined) {
    throw perplexityServiceError(
      'jsonSchema can only be used with responseFormat "json_schema".'
    );
  }

  if (input.responseFormat === 'json_schema') {
    if (!input.jsonSchema || Object.keys(input.jsonSchema).length === 0) {
      throw perplexityServiceError(
        'jsonSchema is required when responseFormat is "json_schema".'
      );
    }

    return {
      type: 'json_schema' as const,
      json_schema: input.jsonSchema
    };
  }

  if (input.responseFormat === 'text') {
    return { type: 'text' as const };
  }

  return undefined;
};

export let buildSonarRequest = (input: SonarInput): ChatCompletionRequest => ({
  model: input.model,
  messages: input.messages,
  max_tokens: input.maxTokens,
  temperature: input.temperature,
  top_p: input.topP,
  frequency_penalty: input.frequencyPenalty,
  presence_penalty: input.presencePenalty,
  search_recency_filter: input.searchRecencyFilter,
  search_domain_filter: input.searchDomainFilter,
  search_language_filter: input.searchLanguageFilter,
  search_after_date_filter: input.searchAfterDate,
  search_before_date_filter: input.searchBeforeDate,
  last_updated_after_filter: input.lastUpdatedAfter,
  last_updated_before_filter: input.lastUpdatedBefore,
  search_mode: input.searchMode,
  return_images: input.returnImages,
  return_related_questions: input.returnRelatedQuestions,
  disable_search: input.disableSearch,
  enable_search_classifier: input.enableSearchClassifier,
  reasoning_effort: input.reasoningEffort,
  image_format_filter: input.imageFormatFilter,
  image_domain_filter: input.imageDomainFilter,
  web_search_options: input.searchContextSize
    ? { search_context_size: input.searchContextSize }
    : undefined,
  response_format: buildResponseFormat(input),
  stream: false
});
