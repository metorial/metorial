import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractEntitiesTool = SlateTool.create(spec, {
  name: 'Extract Entities',
  key: 'extract_entities',
  description: `Extracts named entities from text, identifying up to 18 entity types (PERSON, LOCATION, ORGANIZATION, PRODUCT, etc.) across 20 languages. Optionally links entities to Wikidata, DBpedia, or Refinitiv PermID knowledge bases for disambiguation. Can also calculate salience and confidence scores.`,
  instructions: [
    'Set linkEntities to true to get Wikidata QIDs for entity disambiguation.',
    'Enable calculateConfidence to receive confidence scores for each entity.',
    'Enable calculateSalience to determine entity importance relative to the document.'
  ],
  constraints: ['Maximum payload size is 600KB with a maximum of 50,000 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z.string().describe('The text to extract entities from'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-3 language code. Auto-detected if not specified.'),
      linkEntities: z
        .boolean()
        .optional()
        .describe('Link entities to Wikidata knowledge base for disambiguation'),
      calculateConfidence: z
        .boolean()
        .optional()
        .describe('Include confidence scores for each entity'),
      calculateSalience: z
        .boolean()
        .optional()
        .describe('Calculate salience (importance) scores for each entity'),
      includeDBpediaTypes: z
        .boolean()
        .optional()
        .describe('Include DBpedia ontology types (requires linkEntities)')
    })
  )
  .output(
    z.object({
      entities: z
        .array(
          z.object({
            type: z.string().describe('Entity type (e.g., PERSON, LOCATION, ORGANIZATION)'),
            mention: z.string().describe('The entity text as it appears in the content'),
            normalized: z
              .string()
              .optional()
              .describe('Normalized form of the entity mention'),
            count: z.number().optional().describe('Number of times the entity was mentioned'),
            entityId: z.string().optional().describe('Wikidata QID or temporary ID'),
            confidence: z.number().optional().describe('Extraction confidence score'),
            linkingConfidence: z
              .number()
              .optional()
              .describe('Confidence of the knowledge base link'),
            salience: z.number().optional().describe('Entity salience score'),
            mentionOffsets: z
              .array(
                z.object({
                  startOffset: z.number(),
                  endOffset: z.number()
                })
              )
              .optional()
              .describe('Character offsets of entity mentions in the text'),
            dbpediaTypes: z.array(z.string()).optional().describe('DBpedia ontology types')
          })
        )
        .describe('Extracted entities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let options: Record<string, unknown> = {};
    let optionsObj: Record<string, unknown> = {};

    if (ctx.input.linkEntities !== undefined) optionsObj.linkEntities = ctx.input.linkEntities;
    if (ctx.input.calculateConfidence !== undefined)
      optionsObj.calculateConfidence = ctx.input.calculateConfidence;
    if (ctx.input.calculateSalience !== undefined)
      optionsObj.calculateSalience = ctx.input.calculateSalience;
    if (ctx.input.includeDBpediaTypes !== undefined)
      optionsObj.includeDBpediaTypes = ctx.input.includeDBpediaTypes;

    if (Object.keys(optionsObj).length > 0) {
      options.options = optionsObj;
    }

    let result = await client.extractEntities(ctx.input.content, ctx.input.language, options);

    let entities = result.entities ?? [];

    return {
      output: {
        entities
      },
      message: `Extracted **${entities.length}** entit${entities.length === 1 ? 'y' : 'ies'} from the text.${entities.length > 0 ? ` Types found: ${[...new Set(entities.map((e: { type: string }) => e.type))].join(', ')}.` : ''}`
    };
  })
  .build();
