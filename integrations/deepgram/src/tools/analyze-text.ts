import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { spec } from '../spec';

export let analyzeTextTool = SlateTool.create(spec, {
  name: 'Analyze Text',
  key: 'analyze_text',
  description: `Analyze text for intelligence insights including sentiment analysis, topic detection, intent detection, and summarization. Enable one or more analysis features to extract value from text content such as transcripts, articles, or conversations.`,
  instructions: [
    'Enable at least one analysis feature (summarize, topics, intents, or sentiment).',
    'All features can be combined in a single request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('The text content to analyze.'),
      language: z
        .string()
        .optional()
        .describe(
          'BCP-47 language code of the text (e.g., "en", "es"). Auto-detected if not provided.'
        ),
      summarize: z.boolean().optional().describe('Generate a concise summary of the text.'),
      topics: z.boolean().optional().describe('Detect topics discussed in the text.'),
      intents: z.boolean().optional().describe('Detect intents expressed in the text.'),
      sentiment: z
        .boolean()
        .optional()
        .describe('Analyze overall and segment-level sentiment.')
    })
  )
  .output(
    z.object({
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
    let client = new DeepgramClient(ctx.auth.token);

    let result = await client.analyzeText({
      text: ctx.input.text,
      language: ctx.input.language,
      summarize: ctx.input.summarize,
      topics: ctx.input.topics,
      intents: ctx.input.intents,
      sentiment: ctx.input.sentiment
    });

    let features: string[] = [];
    if (ctx.input.summarize) features.push('summary');
    if (ctx.input.topics) features.push('topics');
    if (ctx.input.intents) features.push('intents');
    if (ctx.input.sentiment) features.push('sentiment');

    return {
      output: {
        summary: result.results?.summary,
        topics: result.results?.topics,
        intents: result.results?.intents,
        sentiments: result.results?.sentiments,
        metadata: result.metadata
      },
      message: `Analyzed text (${ctx.input.text.length} chars) for: ${features.join(', ') || 'no features enabled'}`
    };
  })
  .build();
