import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dataForSEOServiceError } from '../lib/errors';
import { spec } from '../spec';

let llmMentionSchema = z
  .object({
    platform: z.string().optional().describe('AI platform that produced the mention data'),
    modelName: z.string().optional().describe('LLM model name'),
    question: z.string().optional().describe('Question represented in the result'),
    answer: z.string().optional().describe('Answer markdown returned by the platform'),
    aiSearchVolume: z.number().optional().describe('AI search volume metric'),
    sources: z.array(z.any()).optional().describe('Sources cited by the model')
  })
  .passthrough();

let aiKeywordVolumeSchema = z
  .object({
    keyword: z.string().optional().describe('Keyword'),
    aiSearchVolume: z.number().optional().describe('Current AI search volume rate'),
    monthlySearches: z.array(z.any()).optional().describe('Monthly AI search volume trend')
  })
  .passthrough();

export let aiOptimization = SlateTool.create(spec, {
  name: 'AI Optimization',
  key: 'ai_optimization',
  description: `Run practical DataForSEO AI Optimization requests: AI keyword search volume, LLM mentions search, and live LLM response benchmarking for ChatGPT, Claude, Gemini, and Perplexity.`,
  instructions: [
    'Use action "ai_keyword_search_volume" with keywords to estimate AI search demand.',
    'Use action "llm_mentions_search" with target entities to find mentions in Google AI Overview or ChatGPT mention data.',
    'Use action "llm_response" with platform, userPrompt, and modelName for a live benchmark response.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['ai_keyword_search_volume', 'llm_mentions_search', 'llm_response'])
        .describe('AI Optimization action to run'),
      keywords: z
        .array(z.string())
        .optional()
        .describe('Keywords to inspect. Required for ai_keyword_search_volume.'),
      target: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'LLM mention target entities. Required for llm_mentions_search. Each object should contain either domain or keyword plus optional search_filter, search_scope, match_type, or include_subdomains.'
        ),
      mentionPlatform: z
        .enum(['google', 'chat_gpt'])
        .optional()
        .describe('LLM Mentions source platform. Applies only to llm_mentions_search.'),
      platform: z
        .enum(['chat_gpt', 'claude', 'gemini', 'perplexity'])
        .optional()
        .describe('LLM Responses platform. Required for llm_response.'),
      userPrompt: z.string().optional().describe('User prompt. Required for llm_response.'),
      modelName: z.string().optional().describe('Model name. Required for llm_response.'),
      locationName: z
        .string()
        .optional()
        .describe('Location name for keyword volume or mentions'),
      locationCode: z.number().optional().describe('DataForSEO location code'),
      languageName: z
        .string()
        .optional()
        .describe('Language name for keyword volume or mentions'),
      languageCode: z
        .string()
        .optional()
        .describe('Language code for keyword volume or mentions'),
      aiModelName: z.string().optional().describe('AI model filter for llm_mentions_search'),
      limit: z.number().optional().describe('Maximum LLM mentions to return'),
      offset: z.number().optional().describe('LLM mentions pagination offset'),
      filters: z.array(z.any()).optional().describe('DataForSEO LLM Mentions filters'),
      orderBy: z.array(z.string()).optional().describe('LLM Mentions sort rules'),
      systemMessage: z.string().optional().describe('System instruction for llm_response'),
      messageChain: z
        .array(
          z.object({
            role: z.enum(['user', 'ai']).describe('Message role'),
            message: z.string().describe('Message content')
          })
        )
        .optional()
        .describe('Optional conversation history for llm_response'),
      maxOutputTokens: z
        .number()
        .optional()
        .describe('Maximum response tokens for llm_response'),
      temperature: z.number().optional().describe('Sampling temperature for llm_response'),
      topP: z.number().optional().describe('Top-p sampling value for llm_response'),
      webSearch: z
        .boolean()
        .optional()
        .describe('Enable web search for llm_response when supported'),
      webSearchCountryIsoCode: z
        .string()
        .optional()
        .describe('Web search country ISO code for llm_response'),
      webSearchCity: z.string().optional().describe('Web search city for llm_response'),
      useReasoning: z
        .boolean()
        .optional()
        .describe('Enable reasoning for llm_response when supported')
    })
  )
  .output(
    z.object({
      action: z.string().describe('AI Optimization action run'),
      keywords: z
        .array(aiKeywordVolumeSchema)
        .optional()
        .describe('AI keyword volume results'),
      mentions: z.array(llmMentionSchema).optional().describe('LLM mentions results'),
      response: z.any().optional().describe('Live LLM response result'),
      totalCount: z.number().optional().describe('Total matching LLM mentions'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'ai_keyword_search_volume') {
      if (!ctx.input.keywords?.length) {
        throw dataForSEOServiceError(
          'keywords is required when action is "ai_keyword_search_volume".'
        );
      }

      let response = await client.aiKeywordSearchVolumeLive({
        keywords: ctx.input.keywords,
        locationName: ctx.input.locationName,
        locationCode: ctx.input.locationCode,
        languageName: ctx.input.languageName,
        languageCode: ctx.input.languageCode
      });
      let result = client.extractFirstResult(response);
      let keywords = (result?.items ?? []).map((item: any) => ({
        keyword: item.keyword,
        aiSearchVolume: item.ai_search_volume,
        monthlySearches: item.monthly_searches
      }));

      return {
        output: {
          action: ctx.input.action,
          keywords,
          cost: response.cost
        },
        message: `Retrieved AI keyword volume for **${keywords.length}** keyword(s).`
      };
    }

    if (ctx.input.action === 'llm_mentions_search') {
      if (!ctx.input.target?.length) {
        throw dataForSEOServiceError(
          'target is required when action is "llm_mentions_search".'
        );
      }

      let response = await client.llmMentionsSearchLive({
        target: ctx.input.target,
        platform: ctx.input.mentionPlatform,
        locationName: ctx.input.locationName,
        locationCode: ctx.input.locationCode,
        languageName: ctx.input.languageName,
        languageCode: ctx.input.languageCode,
        aiModelName: ctx.input.aiModelName,
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        filters: ctx.input.filters,
        orderBy: ctx.input.orderBy
      });
      let result = client.extractFirstResult(response);
      let mentions = (result?.items ?? []).map((item: any) => ({
        platform: item.platform,
        modelName: item.model_name,
        question: item.question,
        answer: item.answer,
        aiSearchVolume: item.ai_search_volume,
        sources: item.sources
      }));

      return {
        output: {
          action: ctx.input.action,
          totalCount: result?.total_count,
          mentions,
          cost: response.cost
        },
        message: `Found **${mentions.length}** LLM mention result(s).`
      };
    }

    if (!ctx.input.platform) {
      throw dataForSEOServiceError('platform is required when action is "llm_response".');
    }

    if (!ctx.input.userPrompt) {
      throw dataForSEOServiceError('userPrompt is required when action is "llm_response".');
    }

    if (!ctx.input.modelName) {
      throw dataForSEOServiceError('modelName is required when action is "llm_response".');
    }

    let response = await client.llmResponsesLive({
      platform: ctx.input.platform,
      userPrompt: ctx.input.userPrompt,
      modelName: ctx.input.modelName,
      systemMessage: ctx.input.systemMessage,
      messageChain: ctx.input.messageChain,
      maxOutputTokens: ctx.input.maxOutputTokens,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      webSearch: ctx.input.webSearch,
      webSearchCountryIsoCode: ctx.input.webSearchCountryIsoCode,
      webSearchCity: ctx.input.webSearchCity,
      useReasoning: ctx.input.useReasoning
    });
    let result = client.extractFirstResult(response);

    return {
      output: {
        action: ctx.input.action,
        response: result,
        cost: response.cost
      },
      message: `Retrieved live ${ctx.input.platform} LLM response.`
    };
  })
  .build();
