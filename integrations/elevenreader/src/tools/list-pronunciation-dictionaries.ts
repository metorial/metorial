import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let listPronunciationDictionariesTool = SlateTool.create(spec, {
  name: 'List Pronunciation Dictionaries',
  key: 'list_pronunciation_dictionaries',
  description: `List available pronunciation dictionaries. Pronunciation dictionaries let you customize how specific words or phrases are spoken during text-to-speech generation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of dictionaries to return (1-100). Defaults to 30'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      dictionaries: z
        .array(
          z.object({
            dictionaryId: z.string().describe('Unique dictionary identifier'),
            name: z.string().describe('Dictionary name'),
            description: z.string().optional().describe('Dictionary description'),
            latestVersionId: z.string().optional().describe('ID of the latest version'),
            rulesCount: z
              .number()
              .optional()
              .describe('Number of rules in the latest version'),
            createdBy: z.string().optional().describe('User who created the dictionary'),
            creationTimeUnix: z.number().optional().describe('Unix timestamp of creation')
          })
        )
        .describe('List of pronunciation dictionaries'),
      hasMore: z.boolean().describe('Whether more dictionaries are available'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.listPronunciationDictionaries({
      pageSize: ctx.input.pageSize,
      cursor: ctx.input.cursor
    });

    let dictionaries = (result.pronunciation_dictionaries || []).map((d: any) => ({
      dictionaryId: d.id,
      name: d.name,
      description: d.description,
      latestVersionId: d.latest_version_id,
      rulesCount: d.latest_version_rules_num,
      createdBy: d.created_by,
      creationTimeUnix: d.creation_time_unix
    }));

    return {
      output: {
        dictionaries,
        hasMore: result.has_more || false,
        nextCursor: result.next_cursor
      },
      message: `Found ${dictionaries.length} pronunciation dictionaries${result.has_more ? ' (more available)' : ''}.`
    };
  })
  .build();
