import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dictionarySchema = z.object({
  dictionaryId: z.string().describe('Unique identifier of the dictionary'),
  matchType: z
    .string()
    .optional()
    .describe('Matching mode: "stem" for relaxed matching or "token" for literal matching'),
  caseInsensitive: z.boolean().optional().describe('Whether matching is case-insensitive'),
  language: z
    .string()
    .optional()
    .describe('ISO-639-2 language code or "any" for all languages')
});

export let manageDictionary = SlateTool.create(spec, {
  name: 'Manage Dictionary',
  key: 'manage_dictionary',
  description: `Create, retrieve, list, or delete custom entity dictionaries. Entity dictionaries augment TextRazor's entity extraction with domain-specific entities like product names, drug names, or person names.
Use the **action** field to specify the operation. When creating, configure matching behavior with matchType, caseInsensitive, and language options.`,
  instructions: [
    'Use "list" to see all dictionaries. Use "get" or "delete" with a dictionaryId. Use "create" with a dictionaryId and optional configuration.',
    'matchType "stem" matches word variations (e.g., love/loved/loves). matchType "token" matches literally.'
  ],
  constraints: [
    'Free accounts: 1 dictionary with 50 entries max. Paid plans: up to 10 dictionaries with 10,000 total entries.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Operation to perform'),
      dictionaryId: z
        .string()
        .optional()
        .describe('Dictionary ID (required for create, get, delete)'),
      matchType: z
        .enum(['stem', 'token'])
        .optional()
        .describe('Matching mode for create: "stem" (relaxed) or "token" (literal)'),
      caseInsensitive: z
        .boolean()
        .optional()
        .describe('Enable case-insensitive matching for create'),
      language: z.string().optional().describe('ISO-639-2 language code or "any" for create')
    })
  )
  .output(
    z.object({
      dictionaries: z
        .array(dictionarySchema)
        .optional()
        .describe('List of dictionaries (for list action)'),
      dictionary: dictionarySchema
        .optional()
        .describe('Single dictionary (for get/create actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, dictionaryId, matchType, caseInsensitive, language } = ctx.input;

    if (action === 'list') {
      let dictionaries = await client.listDictionaries();
      let mapped = dictionaries.map(d => ({
        dictionaryId: d.id,
        matchType: d.matchType,
        caseInsensitive: d.caseInsensitive,
        language: d.language
      }));
      return {
        output: { dictionaries: mapped },
        message: `Found **${mapped.length}** dictionaries.`
      };
    }

    if (!dictionaryId) {
      throw new Error('dictionaryId is required for create, get, and delete actions.');
    }

    if (action === 'create') {
      await client.createDictionary(dictionaryId, { matchType, caseInsensitive, language });
      return {
        output: {
          dictionary: { dictionaryId, matchType, caseInsensitive, language }
        },
        message: `Dictionary **${dictionaryId}** created successfully.`
      };
    }

    if (action === 'get') {
      let dict = await client.getDictionary(dictionaryId);
      return {
        output: {
          dictionary: {
            dictionaryId: dict.id,
            matchType: dict.matchType,
            caseInsensitive: dict.caseInsensitive,
            language: dict.language
          }
        },
        message: `Retrieved dictionary **${dictionaryId}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteDictionary(dictionaryId);
      return {
        output: {},
        message: `Dictionary **${dictionaryId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
