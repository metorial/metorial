import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let wordSchema = z
  .object({
    position: z.number().describe('Position of the word in the sentence'),
    startingPos: z.number().describe('Unicode character offset start'),
    endingPos: z.number().describe('Unicode character offset end'),
    token: z.string().describe('Raw text of the word'),
    stem: z.string().optional().describe('Stemmed form of the word'),
    lemma: z.string().optional().describe('Lemma (dictionary form) of the word'),
    partOfSpeech: z.string().optional().describe('Part-of-speech tag'),
    parentPosition: z.number().optional().describe('Position of the grammatical parent word'),
    relationToParent: z.string().optional().describe('Dependency relation to the parent word'),
    senses: z
      .array(
        z.object({
          synset: z.string().describe('WordNet synset identifier'),
          score: z.number().describe('Confidence score for this sense')
        })
      )
      .optional()
      .describe('Word sense disambiguation results'),
    spellingSuggestions: z
      .array(
        z.object({
          suggestion: z.string().describe('Suggested spelling correction'),
          score: z.number().describe('Confidence score for this suggestion')
        })
      )
      .optional()
      .describe('Spelling correction suggestions')
  })
  .describe('Analyzed word with linguistic annotations');

let entitySchema = z
  .object({
    entityId: z.string().optional().describe('Disambiguated Wikipedia entity ID'),
    entityEnglishId: z.string().optional().describe('English Wikipedia entity ID'),
    customEntityId: z.string().optional().describe('Custom dictionary entity ID'),
    confidenceScore: z
      .number()
      .optional()
      .describe('Disambiguation confidence (0.5-10 typical range)'),
    relevanceScore: z.number().optional().describe('Relevance to the document (0-1)'),
    type: z.array(z.string()).optional().describe('DBpedia types'),
    freebaseTypes: z.array(z.string()).optional().describe('Freebase types'),
    freebaseId: z.string().optional().describe('Freebase identifier'),
    wikidataId: z.string().optional().describe('Wikidata QID'),
    wikiLink: z.string().optional().describe('Wikipedia URL'),
    matchingTokens: z
      .array(z.number())
      .optional()
      .describe('Token positions that matched this entity'),
    matchedText: z.string().optional().describe('Source text that matched'),
    data: z
      .record(z.string(), z.array(z.string()))
      .optional()
      .describe('Custom metadata from entity dictionaries')
  })
  .describe('Recognized entity linked to knowledge bases');

let topicSchema = z
  .object({
    label: z.string().describe('Topic label'),
    score: z.number().describe('Relevance score (0-1)'),
    wikiLink: z.string().optional().describe('Wikipedia URL'),
    wikidataId: z.string().optional().describe('Wikidata QID')
  })
  .describe('Extracted topic');

let categorySchema = z
  .object({
    categoryId: z.string().describe('Category identifier within the taxonomy'),
    label: z.string().optional().describe('Human-readable category name'),
    score: z.number().describe('Classification confidence score (0-1)'),
    classifierId: z
      .string()
      .optional()
      .describe('Classifier that produced this classification')
  })
  .describe('Document classification result');

let relationSchema = z
  .object({
    wordPositions: z.array(z.number()).describe('Predicate word positions'),
    params: z
      .array(
        z.object({
          relation: z.string().describe('Relation type (e.g., SUBJECT, OBJECT)'),
          wordPositions: z
            .array(z.number())
            .describe('Word positions for this relation parameter')
        })
      )
      .describe('Relation parameters')
  })
  .describe('Grammatical relation between words');

let entailmentSchema = z
  .object({
    wordPositions: z.array(z.number()).describe('Token positions generating this entailment'),
    score: z.number().describe('Combined confidence score'),
    priorScore: z.number().optional().describe('Context-independent score'),
    contextScore: z.number().optional().describe('Source-entailed usage agreement score'),
    entailedTree: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Entailed word structure')
  })
  .describe('Logical entailment derived from the text');

export let analyzeText = SlateTool.create(spec, {
  name: 'Analyze Text',
  key: 'analyze_text',
  description: `Analyze text or a URL using TextRazor's NLP engine. Extracts entities, topics, categories, relations, dependency trees, word senses, phrases, spelling corrections, and entailments from the input.
Provide either raw text or a publicly accessible URL to analyze, along with one or more extractors to control which analyses are performed.
Use **classifiers** to categorize documents against built-in taxonomies (IAB, IPTC) or custom classifiers. Use **entity dictionaries** to augment entity extraction with custom entities.`,
  instructions: [
    'You must provide either "text" or "sourceUrl", but not both.',
    'You must specify at least one extractor. Common combinations: ["entities", "topics"] for general NLP, ["entities", "relations", "words"] for detailed linguistic analysis.',
    'Built-in classifier IDs: "textrazor_iab_content_taxonomy_3.0", "textrazor_iab_content_taxonomy", "textrazor_newscodes", "textrazor_mediatopics", "textrazor_mediatopics_20170101".'
  ],
  constraints: [
    'Text input is limited to 200KB of UTF-8 text.',
    'URL must be publicly accessible for URL-based analysis.'
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
        .describe(
          'Raw text to analyze (up to 200KB UTF-8). Provide either text or sourceUrl.'
        ),
      sourceUrl: z
        .string()
        .optional()
        .describe(
          'Publicly accessible URL to download and analyze. Provide either text or sourceUrl.'
        ),
      extractors: z
        .array(
          z.enum([
            'entities',
            'topics',
            'words',
            'phrases',
            'dependency-trees',
            'relations',
            'entailments',
            'senses',
            'spelling'
          ])
        )
        .min(1)
        .describe('NLP extractors to apply to the text'),
      languageOverride: z
        .string()
        .optional()
        .describe('ISO-639-2 language code to force instead of auto-detection'),
      cleanupMode: z
        .enum(['raw', 'stripTags', 'cleanHTML'])
        .optional()
        .describe('HTML cleanup mode for URL-based analysis'),
      cleanupReturnCleaned: z
        .boolean()
        .optional()
        .describe('Return the cleaned version of the text in the response'),
      cleanupReturnRaw: z
        .boolean()
        .optional()
        .describe('Return the raw downloaded text in the response'),
      entityDictionaries: z
        .array(z.string())
        .optional()
        .describe('Custom dictionary IDs to use for entity extraction'),
      entityFilterDbpediaTypes: z
        .array(z.string())
        .optional()
        .describe('Only return entities matching these DBpedia types'),
      entityFilterFreebaseTypes: z
        .array(z.string())
        .optional()
        .describe('Only return entities matching these Freebase types'),
      entityAllowOverlap: z
        .boolean()
        .optional()
        .describe('Allow overlapping entity matches (default: true)'),
      classifiers: z
        .array(z.string())
        .optional()
        .describe('Classifier IDs to use for document classification'),
      rules: z.string().optional().describe('Custom Prolog rules to evaluate')
    })
  )
  .output(
    z.object({
      time: z.number().describe('Processing time in seconds'),
      language: z.string().optional().describe('Detected or forced language code'),
      languageIsReliable: z
        .boolean()
        .optional()
        .describe('Whether language detection is confident'),
      cleanedText: z
        .string()
        .optional()
        .describe('Cleaned text (if cleanup.returnCleaned was set)'),
      rawText: z.string().optional().describe('Raw text (if cleanup.returnRaw was set)'),
      sentences: z
        .array(
          z.object({
            words: z.array(wordSchema).describe('Words in this sentence')
          })
        )
        .optional()
        .describe('Tokenized sentences with word-level annotations'),
      entities: z.array(entitySchema).optional().describe('Recognized named entities'),
      topics: z.array(topicSchema).optional().describe('Extracted topics'),
      categories: z.array(categorySchema).optional().describe('Document classifications'),
      relations: z.array(relationSchema).optional().describe('Grammatical relations'),
      entailments: z.array(entailmentSchema).optional().describe('Logical entailments'),
      nounPhrases: z
        .array(
          z.object({
            wordPositions: z.array(z.number()).describe('Token positions in the phrase')
          })
        )
        .optional()
        .describe('Extracted noun phrases'),
      properties: z
        .array(
          z.object({
            wordPositions: z.array(z.number()).describe('Predicate word positions'),
            propertyPositions: z.array(z.number()).describe('Property word positions')
          })
        )
        .optional()
        .describe('Extracted properties'),
      customAnnotationOutput: z.string().optional().describe('Output from custom Prolog rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.analyzeText({
      text: ctx.input.text,
      url: ctx.input.sourceUrl,
      extractors: ctx.input.extractors,
      languageOverride: ctx.input.languageOverride,
      cleanupMode: ctx.input.cleanupMode,
      cleanupReturnCleaned: ctx.input.cleanupReturnCleaned,
      cleanupReturnRaw: ctx.input.cleanupReturnRaw,
      entityDictionaries: ctx.input.entityDictionaries,
      entityFilterDbpediaTypes: ctx.input.entityFilterDbpediaTypes,
      entityFilterFreebaseTypes: ctx.input.entityFilterFreebaseTypes,
      entityAllowOverlap: ctx.input.entityAllowOverlap,
      classifiers: ctx.input.classifiers,
      rules: ctx.input.rules
    });

    let summaryParts: string[] = [];
    summaryParts.push(`Analyzed in **${result.time?.toFixed(3) ?? '?'}s**`);
    if (result.language) summaryParts.push(`Language: **${result.language}**`);
    if (result.entities?.length)
      summaryParts.push(`**${result.entities.length}** entities found`);
    if (result.topics?.length)
      summaryParts.push(`**${result.topics.length}** topics extracted`);
    if (result.categories?.length)
      summaryParts.push(`**${result.categories.length}** categories matched`);
    if (result.relations?.length)
      summaryParts.push(`**${result.relations.length}** relations found`);
    if (result.sentences?.length)
      summaryParts.push(`**${result.sentences.length}** sentences processed`);

    return {
      output: {
        time: result.time,
        language: result.language,
        languageIsReliable: result.languageIsReliable,
        cleanedText: result.cleanedText,
        rawText: result.rawText,
        sentences: result.sentences,
        entities: result.entities,
        topics: result.topics,
        categories: result.categories,
        relations: result.relations,
        entailments: result.entailments,
        nounPhrases: result.nounPhrases,
        properties: result.properties,
        customAnnotationOutput: result.customAnnotationOutput
      },
      message: summaryParts.join(' | ')
    };
  })
  .build();
