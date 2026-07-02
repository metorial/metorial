import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerplexityClient } from '../lib/client';
import { perplexityServiceError } from '../lib/errors';
import { spec } from '../spec';
import { buildSonarRequest, sonarInputSchema } from './sonar';

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
    'Set disableSearch to true to use the model without web search.',
    'Date filters use MM/DD/YYYY format (e.g., "03/01/2025").',
    'Use responseFormat "json_schema" with jsonSchema when strict structured output is required.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(sonarInputSchema)
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
            snippet: z.string().optional(),
            source: z.string().optional(),
            lastUpdated: z.string().optional()
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

    let response = await client.chatCompletion(buildSonarRequest(ctx.input));

    let choice = response.choices[0];
    if (!choice) {
      throw perplexityServiceError(
        'Perplexity Sonar response did not include a completion choice.'
      );
    }

    let contentPreview = choice.message.content.substring(0, 200);
    let citationCount = response.citations?.length ?? 0;
    let searchResults = response.search_results?.map(result => ({
      title: result.title,
      url: result.url,
      date: result.date ?? undefined,
      snippet: result.snippet ?? undefined,
      source: result.source ?? undefined,
      lastUpdated: result.last_updated ?? undefined
    }));

    return {
      output: {
        completionId: response.id,
        model: response.model,
        content: choice.message.content,
        finishReason: choice.finish_reason,
        citations: response.citations,
        searchResults,
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
