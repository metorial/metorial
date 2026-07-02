import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let entrySchema = z.object({
  entryId: z.string().optional().describe('Unique identifier of the entry'),
  text: z.string().describe('Text to match against'),
  data: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe('Custom metadata key-value pairs')
});

export let manageDictionaryEntries = SlateTool.create(spec, {
  name: 'Manage Dictionary Entries',
  key: 'manage_dictionary_entries',
  description: `Add, list, retrieve, or delete entries in a custom entity dictionary. Each entry defines text to match and optional metadata key-value pairs.
Use this to populate dictionaries with domain-specific entities for enhanced entity extraction.`,
  instructions: [
    'Use "add" with an array of entries to batch-add entities. Use "list" with pagination to browse entries. Use "get" or "delete" with a specific entryId.',
    'Custom metadata (data) is limited to 10 keys and 1,000 characters total per entry.'
  ],
  constraints: [
    'Free accounts: max 50 entries total. Paid plans: up to 10,000 total entries across all dictionaries.'
  ]
})
  .input(
    z.object({
      action: z.enum(['add', 'list', 'get', 'delete']).describe('Operation to perform'),
      dictionaryId: z.string().describe('Dictionary ID to manage entries for'),
      entries: z
        .array(
          z.object({
            entryId: z
              .string()
              .optional()
              .describe('Optional unique ID for the entry (auto-generated if omitted)'),
            text: z.string().describe('Text to match against'),
            data: z
              .record(z.string(), z.array(z.string()))
              .optional()
              .describe('Custom metadata key-value pairs')
          })
        )
        .optional()
        .describe('Entries to add (for add action)'),
      entryId: z
        .string()
        .optional()
        .describe('Entry ID (required for get and delete actions)'),
      limit: z
        .number()
        .optional()
        .describe('Number of entries to return for list (default: 20)'),
      offset: z.number().optional().describe('Offset for pagination in list (default: 0)')
    })
  )
  .output(
    z.object({
      entries: z.array(entrySchema).optional().describe('List of entries (for list action)'),
      entry: entrySchema.optional().describe('Single entry (for get action)'),
      total: z
        .number()
        .optional()
        .describe('Total number of entries in the dictionary (for list action)'),
      addedCount: z.number().optional().describe('Number of entries added (for add action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, dictionaryId, entries, entryId, limit, offset } = ctx.input;

    if (action === 'list') {
      let result = await client.listDictionaryEntries(dictionaryId, limit ?? 20, offset ?? 0);
      let mapped = result.entries.map(e => ({
        entryId: e.id,
        text: e.text,
        data: e.data
      }));
      return {
        output: { entries: mapped, total: result.total },
        message: `Showing **${mapped.length}** of **${result.total}** entries in dictionary **${dictionaryId}**.`
      };
    }

    if (action === 'add') {
      if (!entries || entries.length === 0) {
        throw new Error('At least one entry is required for the add action.');
      }
      let apiEntries = entries.map(e => ({
        id: e.entryId,
        text: e.text,
        data: e.data
      }));
      await client.addDictionaryEntries(dictionaryId, apiEntries);
      return {
        output: { addedCount: entries.length },
        message: `Added **${entries.length}** entries to dictionary **${dictionaryId}**.`
      };
    }

    if (!entryId) {
      throw new Error('entryId is required for get and delete actions.');
    }

    if (action === 'get') {
      let entry = await client.getDictionaryEntry(dictionaryId, entryId);
      return {
        output: {
          entry: {
            entryId: entry.id,
            text: entry.text,
            data: entry.data
          }
        },
        message: `Retrieved entry **${entryId}** from dictionary **${dictionaryId}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteDictionaryEntry(dictionaryId, entryId);
      return {
        output: {},
        message: `Deleted entry **${entryId}** from dictionary **${dictionaryId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
