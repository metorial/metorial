import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let abuseItemSchema = z.object({
  sentenceIndex: z.number().describe('Zero-based index of the sentence'),
  offset: z.number().describe('Zero-based character offset'),
  length: z.number().describe('Number of characters in the offending fragment'),
  text: z.string().optional().describe('The abusive text snippet (when snippets enabled)'),
  type: z
    .string()
    .describe(
      'Abuse type: personal_attack, bigotry, profanity, sexual_advances, criminal_activity, external_contact, adult_only, mental_issues, spam, allegation, no_meaningful_content, contentious, assertion_of_hierarchy, disturbing, data_leak'
    ),
  severity: z.string().describe('Severity: low, medium, high, or extreme'),
  tags: z.array(z.string()).optional().describe('Additional abuse tags'),
  explanation: z.string().optional().describe('Reasoning for detection (when explain enabled)')
});

let sentimentExpressionSchema = z.object({
  sentenceIndex: z.number().describe('Zero-based sentence index'),
  offset: z.number().describe('Character offset'),
  length: z.number().describe('Character length'),
  text: z.string().optional().describe('Snippet text (when snippets enabled)'),
  polarity: z.string().describe('Sentiment polarity: positive, negative, mixed, or default'),
  targets: z.array(z.string()).optional().describe('Aspect targets of the sentiment'),
  reasons: z.array(z.string()).optional().describe('Reasons for the sentiment'),
  explanation: z.string().optional().describe('Reasoning (when explain enabled)')
});

let entitySchema = z.object({
  name: z.string().describe('Entity name as detected'),
  refLemma: z.string().optional().describe('Dictionary form in the reference language'),
  type: z
    .union([z.string(), z.array(z.string())])
    .describe(
      'Entity type(s): person, organization, place, software, numeric, amount_of_money, website, crypto, credit_card, file'
    ),
  subtype: z.string().optional().describe('Entity subtype'),
  mentions: z
    .array(
      z.object({
        sentenceIndex: z.number().describe('Sentence index of mention'),
        offset: z.number().describe('Character offset of mention'),
        length: z.number().describe('Character length of mention'),
        text: z.string().optional().describe('Mention text (when snippets enabled)')
      })
    )
    .describe('All mentions/instances of this entity in the text'),
  familyId: z.number().optional().describe('Associated family ID in Tisane language models')
});

export let analyzeText = SlateTool.create(spec, {
  name: 'Analyze Text',
  key: 'analyze_text',
  description: `Performs comprehensive NLP analysis on text including abusive content detection (hate speech, cyberbullying, sexual harassment, criminal activity), sentiment analysis, named entity extraction, and topic detection. Supports 30+ languages.
Configure the analysis through optional settings to enable/disable specific features like document-level sentiment, word-level tokenization, parse trees, and explanations.`,
  instructions: [
    'Set the language to "*" for automatic language detection, or provide an ISO 639-1 code like "en", "fr", "de".',
    'Enable "snippets" to include the actual text fragments in abuse and sentiment results.',
    'Enable "explain" to get reasoning for abuse and sentiment detections.',
    'Enable "documentSentiment" for an overall sentiment score (-1 to 1) across the entire text.',
    'Use "format" to hint the content type (e.g., "review", "dialogue", "shortpost") for better analysis accuracy.'
  ],
  constraints: [
    'Very large inputs may result in truncated verbose output (indicated by reducedOutput flag).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      language: z
        .string()
        .describe(
          'ISO 639-1 language code (e.g., "en", "fr", "de"). Use "*" for auto-detection.'
        ),
      content: z.string().describe('The text content to analyze'),
      abuse: z
        .boolean()
        .optional()
        .describe('Detect abusive/problematic content. Default: true'),
      sentiment: z
        .boolean()
        .optional()
        .describe('Detect sentiment expressions. Default: true'),
      documentSentiment: z
        .boolean()
        .optional()
        .describe('Calculate overall document-level sentiment (-1 to 1). Default: false'),
      entities: z.boolean().optional().describe('Extract named entities. Default: true'),
      topics: z.boolean().optional().describe('Detect topics. Default: true'),
      topicStats: z
        .boolean()
        .optional()
        .describe('Include topic coverage statistics. Default: false'),
      optimizeTopics: z
        .boolean()
        .optional()
        .describe('Remove less specific overlapping topics. Default: false'),
      words: z
        .boolean()
        .optional()
        .describe('Output individual word/token data per sentence. Default: false'),
      fetchDefinitions: z
        .boolean()
        .optional()
        .describe('Include dictionary definitions (requires words=true). Default: false'),
      parses: z
        .boolean()
        .optional()
        .describe('Output parse trees per sentence. Default: false'),
      snippets: z
        .boolean()
        .optional()
        .describe(
          'Include text snippets in abuse, sentiment, and entity results. Default: false'
        ),
      explain: z
        .boolean()
        .optional()
        .describe('Include explanations for abuse and sentiment detections. Default: false'),
      format: z
        .enum(['review', 'dialogue', 'shortpost', 'longform', 'proofread', 'alias', 'search'])
        .optional()
        .describe('Content format hint for better processing'),
      disableSpellcheck: z
        .boolean()
        .optional()
        .describe('Disable automatic spellchecking. Default: false'),
      subscope: z
        .boolean()
        .optional()
        .describe(
          'Enable sub-scope parsing for hashtags, URLs, obfuscated text. Default: false'
        ),
      featureStandard: z
        .enum(['ud', 'penn', 'native', 'description'])
        .optional()
        .describe('Standard for grammar features output'),
      topicStandard: z
        .enum([
          'native',
          'iptc_code',
          'iptc_description',
          'iab_code',
          'iab_description',
          'wikidata'
        ])
        .optional()
        .describe('Standard for topic output'),
      sentimentAnalysisType: z
        .enum([
          'products_and_services',
          'entity',
          'creative_content_review',
          'political_essay'
        ])
        .optional()
        .describe('Context for sentiment analysis')
    })
  )
  .output(
    z.object({
      text: z.string().describe('The input text echoed back'),
      language: z
        .string()
        .optional()
        .describe('Detected language code (when auto-detection used)'),
      reducedOutput: z
        .boolean()
        .optional()
        .describe('True if input was too large and output was truncated'),
      sentiment: z
        .number()
        .optional()
        .describe('Document-level sentiment score from -1 (negative) to 1 (positive)'),
      topics: z
        .array(z.any())
        .optional()
        .describe('Detected topics as strings or objects with topic and coverage'),
      abuse: z
        .array(abuseItemSchema)
        .optional()
        .describe('Detected abusive content instances'),
      entitiesSummary: z.array(entitySchema).optional().describe('Detected named entities'),
      sentimentExpressions: z
        .array(sentimentExpressionSchema)
        .optional()
        .describe('Detected sentiment expressions'),
      sentenceList: z
        .array(z.any())
        .optional()
        .describe('Per-sentence data with words and parse trees (when enabled)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.parse(ctx.input.language, ctx.input.content, {
      abuse: ctx.input.abuse,
      sentiment: ctx.input.sentiment,
      documentSentiment: ctx.input.documentSentiment,
      entities: ctx.input.entities,
      topics: ctx.input.topics,
      topicStats: ctx.input.topicStats,
      optimizeTopics: ctx.input.optimizeTopics,
      words: ctx.input.words,
      fetchDefinitions: ctx.input.fetchDefinitions,
      parses: ctx.input.parses,
      snippets: ctx.input.snippets,
      explain: ctx.input.explain,
      format: ctx.input.format,
      disableSpellcheck: ctx.input.disableSpellcheck,
      subscope: ctx.input.subscope,
      featureStandard: ctx.input.featureStandard,
      topicStandard: ctx.input.topicStandard,
      sentimentAnalysisType: ctx.input.sentimentAnalysisType
    });

    let parts: string[] = [
      `**Text analyzed** in language \`${result.language || ctx.input.language}\`.`
    ];

    if (result.abuse && result.abuse.length > 0) {
      parts.push(`**${result.abuse.length} abusive content instance(s)** detected.`);
    }
    if (result.sentimentExpressions && result.sentimentExpressions.length > 0) {
      parts.push(`**${result.sentimentExpressions.length} sentiment expression(s)** found.`);
    }
    if (result.sentiment !== undefined) {
      parts.push(`**Document sentiment:** ${result.sentiment}`);
    }
    if (result.entitiesSummary && result.entitiesSummary.length > 0) {
      parts.push(`**${result.entitiesSummary.length} entity/entities** extracted.`);
    }
    if (result.topics && result.topics.length > 0) {
      parts.push(`**${result.topics.length} topic(s)** identified.`);
    }

    return {
      output: result,
      message: parts.join('\n')
    };
  })
  .build();
