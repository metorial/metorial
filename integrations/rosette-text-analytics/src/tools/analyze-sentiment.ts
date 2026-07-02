import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analyzeSentimentTool = SlateTool.create(spec, {
  name: 'Analyze Sentiment',
  key: 'analyze_sentiment',
  description: `Determines sentiment in text at the document level and optionally at the entity level. Returns sentiment labels (pos, neu, neg) with confidence scores. Entity-level analysis identifies entities and determines the sentiment expressed toward each one.`,
  constraints: ['Maximum payload size is 600KB with a maximum of 50,000 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text to analyze sentiment for'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code. Auto-detected if not specified.')
    })
  )
  .output(
    z.object({
      documentSentiment: z
        .object({
          label: z.string().describe('Sentiment label: pos, neu, or neg'),
          confidence: z.number().describe('Confidence score between 0 and 1')
        })
        .describe('Overall document sentiment'),
      entitySentiments: z
        .array(
          z.object({
            type: z.string().optional().describe('Entity type'),
            mention: z.string().optional().describe('Entity mention text'),
            normalized: z.string().optional().describe('Normalized entity form'),
            entityId: z.string().optional().describe('Wikidata QID or temporary ID'),
            sentiment: z
              .object({
                label: z.string().describe('Sentiment label for this entity'),
                confidence: z.number().describe('Confidence score')
              })
              .optional()
          })
        )
        .optional()
        .describe('Entity-level sentiment analysis')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.analyzeSentiment(ctx.input.content, ctx.input.language);

    let docSentiment = result.document?.sentiment ??
      result.sentiment ?? { label: 'neu', confidence: 0 };
    let entitySentiments = result.entities ?? [];

    return {
      output: {
        documentSentiment: {
          label: docSentiment.label,
          confidence: docSentiment.confidence
        },
        entitySentiments
      },
      message: `Document sentiment: **${docSentiment.label}** (${(docSentiment.confidence * 100).toFixed(1)}% confidence).${entitySentiments.length > 0 ? ` Found sentiment for ${entitySentiments.length} entit${entitySentiments.length === 1 ? 'y' : 'ies'}.` : ''}`
    };
  })
  .build();
