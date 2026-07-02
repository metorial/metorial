import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { deepgramServiceError } from '../lib/errors';
import { spec } from '../spec';

let customModeSchema = z
  .enum(['strict', 'extended'])
  .describe('How Deepgram should match custom topics or intents.');

export let analyzeTextTool = SlateTool.create(spec, {
  name: 'Analyze Text',
  key: 'analyze_text',
  description: `Analyze text for intelligence insights including sentiment analysis, topic detection, intent detection, custom topics or intents, and summarization. Enable one or more analysis features to extract value from text content such as transcripts, articles, or conversations.`,
  instructions: [
    'Enable at least one analysis feature: summarize, topics, intents, or sentiment.',
    'Provide either text or textUrl, not both.',
    'Use customTopics only when topics=true, and customIntents only when intents=true.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z
        .string()
        .optional()
        .describe('Plain text content to analyze. Use this or textUrl, not both.'),
      textUrl: z
        .string()
        .optional()
        .describe('URL pointing to text content to analyze. Use this or text, not both.'),
      language: z
        .string()
        .optional()
        .describe(
          'BCP-47 language code of the text, for example "en" or "es". Auto-detected if not provided.'
        ),
      summarize: z.boolean().optional().describe('Generate a concise summary of the text.'),
      topics: z.boolean().optional().describe('Detect topics discussed in the text.'),
      intents: z.boolean().optional().describe('Detect intents expressed in the text.'),
      sentiment: z
        .boolean()
        .optional()
        .describe('Analyze overall and segment-level sentiment.'),
      customTopics: z
        .array(z.string())
        .optional()
        .describe('Custom topics to look for when topics=true.'),
      customTopicMode: customModeSchema.optional(),
      customIntents: z
        .array(z.string())
        .optional()
        .describe('Custom intents to look for when intents=true.'),
      customIntentMode: customModeSchema.optional(),
      tag: z.string().optional().describe('Tag for tracking the request in usage reports.'),
      callbackUrl: z
        .string()
        .optional()
        .describe('Optional callback URL for asynchronous text intelligence results.'),
      callbackMethod: z
        .enum(['POST', 'PUT'])
        .optional()
        .describe('HTTP method Deepgram should use for callback delivery.')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('Unique request identifier.'),
      callbackSubmitted: z
        .boolean()
        .optional()
        .describe('True when Deepgram accepted an asynchronous callback request.'),
      summary: z.any().optional().describe('Summary of the text content.'),
      topics: z.any().optional().describe('Detected topics with confidence scores.'),
      intents: z.any().optional().describe('Detected intents with confidence scores.'),
      sentiments: z
        .any()
        .optional()
        .describe('Sentiment analysis results with segment-level details.'),
      metadata: z.any().optional().describe('Request metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let hasText = Boolean(ctx.input.text);
    let hasTextUrl = Boolean(ctx.input.textUrl);
    if (hasText === hasTextUrl) {
      throw deepgramServiceError('Provide exactly one of text or textUrl.');
    }

    let hasFeature =
      ctx.input.summarize || ctx.input.topics || ctx.input.intents || ctx.input.sentiment;
    if (!hasFeature) {
      throw deepgramServiceError(
        'Enable at least one analysis feature: summarize, topics, intents, or sentiment.'
      );
    }

    if ((ctx.input.customTopics?.length ?? 0) > 0 && !ctx.input.topics) {
      throw deepgramServiceError('customTopics requires topics=true.');
    }

    if (ctx.input.customTopicMode && (ctx.input.customTopics?.length ?? 0) === 0) {
      throw deepgramServiceError('customTopicMode requires at least one customTopics value.');
    }

    if ((ctx.input.customIntents?.length ?? 0) > 0 && !ctx.input.intents) {
      throw deepgramServiceError('customIntents requires intents=true.');
    }

    if (ctx.input.customIntentMode && (ctx.input.customIntents?.length ?? 0) === 0) {
      throw deepgramServiceError(
        'customIntentMode requires at least one customIntents value.'
      );
    }

    if (ctx.input.callbackMethod && !ctx.input.callbackUrl) {
      throw deepgramServiceError('callbackMethod requires callbackUrl.');
    }

    let client = new DeepgramClient(ctx.auth.token);

    let result = await client.analyzeText({
      text: ctx.input.text,
      url: ctx.input.textUrl,
      language: ctx.input.language,
      summarize: ctx.input.summarize,
      topics: ctx.input.topics,
      intents: ctx.input.intents,
      sentiment: ctx.input.sentiment,
      customTopics: ctx.input.customTopics,
      customTopicMode: ctx.input.customTopicMode,
      customIntents: ctx.input.customIntents,
      customIntentMode: ctx.input.customIntentMode,
      tag: ctx.input.tag,
      callback: ctx.input.callbackUrl,
      callbackMethod: ctx.input.callbackMethod
    });

    let requestId =
      result.metadata?.metadata?.request_id ||
      result.metadata?.request_id ||
      result.request_id;

    if (ctx.input.callbackUrl && !result.results) {
      return {
        output: {
          requestId,
          callbackSubmitted: true,
          metadata: result.metadata ?? result
        },
        message: `Submitted asynchronous Deepgram text analysis request${requestId ? ` **${requestId}**` : ''}.`
      };
    }

    let features: string[] = [];
    if (ctx.input.summarize) features.push('summary');
    if (ctx.input.topics) features.push('topics');
    if (ctx.input.intents) features.push('intents');
    if (ctx.input.sentiment) features.push('sentiment');

    return {
      output: {
        requestId,
        callbackSubmitted: false,
        summary: result.results?.summary,
        topics: result.results?.topics,
        intents: result.results?.intents,
        sentiments: result.results?.sentiments,
        metadata: result.metadata
      },
      message: `Analyzed ${ctx.input.text ? `text (${ctx.input.text.length} chars)` : 'text URL'} for: ${features.join(', ')}`
    };
  })
  .build();
