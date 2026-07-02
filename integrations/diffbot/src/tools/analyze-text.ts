import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiffbotClient } from '../lib/client';
import { spec } from '../spec';

let extractedEntitySchema = z
  .object({
    name: z.string().optional().describe('Name of the entity'),
    type: z.string().optional().describe('Entity type (e.g., Person, Organization, Product)'),
    diffbotUri: z.string().optional().describe('Diffbot Knowledge Graph URI for the entity'),
    confidence: z
      .number()
      .optional()
      .describe('Confidence score for the entity identification'),
    salience: z.number().optional().describe('Relevance score of the entity in the text'),
    sentiment: z
      .number()
      .optional()
      .describe('Sentiment score (-1 to 1) for the entity in context'),
    allUris: z.array(z.string()).optional().describe('All URIs associated with the entity'),
    allTypes: z
      .array(
        z.object({
          name: z.string().optional(),
          diffbotUri: z.string().optional()
        })
      )
      .optional()
      .describe('All types associated with the entity')
  })
  .passthrough();

let factSchema = z
  .object({
    humanReadable: z.string().optional().describe('Human-readable representation of the fact'),
    property: z
      .object({
        name: z.string().optional(),
        diffbotUri: z.string().optional()
      })
      .optional()
      .describe('The property/relationship in the fact'),
    entity: z
      .object({
        name: z.string().optional(),
        diffbotUri: z.string().optional()
      })
      .optional()
      .describe('The subject entity'),
    value: z
      .object({
        name: z.string().optional(),
        diffbotUri: z.string().optional()
      })
      .optional()
      .describe('The object entity or literal value')
  })
  .passthrough();

export let analyzeText = SlateTool.create(spec, {
  name: 'Analyze Text',
  key: 'analyze_text',
  description: `Extract entities, facts, relationships, and sentiment from raw text using Diffbot's NLP engine. Identifies people, organizations, products, and other entities, links them to Knowledge Graph records, and extracts structured facts and relationships between entities.`,
  instructions: [
    'Provide raw text content - the API will automatically extract entities, facts, and sentiment.',
    'Supports multiple languages, though English has the most comprehensive feature support.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('Raw text content to analyze'),
      language: z
        .string()
        .optional()
        .describe('Language code (e.g., "en", "fr", "de"). Auto-detected if not specified.')
    })
  )
  .output(
    z.object({
      entities: z.array(extractedEntitySchema).describe('Entities identified in the text'),
      facts: z.array(factSchema).describe('Facts and relationships extracted from the text'),
      language: z.string().optional().describe('Detected language of the text'),
      textSentiment: z
        .number()
        .optional()
        .describe('Overall sentiment score of the text (-1 to 1)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiffbotClient({ token: ctx.auth.token });

    let result = await client.analyzeText({
      content: ctx.input.content,
      lang: ctx.input.language
    });

    let entities = result.entities || [];
    let facts = result.facts || [];

    return {
      output: {
        entities,
        facts,
        language: result.lang || ctx.input.language,
        textSentiment: result.sentiment
      },
      message: `Analyzed text and found **${entities.length}** entities and **${facts.length}** facts.`
    };
  })
  .build();
