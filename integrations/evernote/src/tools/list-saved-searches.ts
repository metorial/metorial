import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSavedSearchesTool = SlateTool.create(spec, {
  name: 'List Saved Searches',
  key: 'list_saved_searches',
  description: `List the active saved searches in the user's Evernote account. Saved searches store reusable Evernote search grammar queries.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      searches: z
        .array(
          z.object({
            searchGuid: z.string().describe('Unique identifier of the saved search'),
            name: z.string().optional().describe('Saved search name'),
            query: z.string().optional().describe('Evernote search grammar query'),
            format: z.number().optional().describe('Saved search format value'),
            updateSequenceNum: z
              .number()
              .optional()
              .describe('Update sequence number for this saved search')
          })
        )
        .describe('Active saved searches in the account'),
      searchCount: z.number().describe('Number of saved searches returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let searches = (await client.listSearches()).map(search => ({
      searchGuid: search.searchGuid || '',
      name: search.name,
      query: search.query,
      format: search.format,
      updateSequenceNum: search.updateSequenceNum
    }));

    return {
      output: {
        searches,
        searchCount: searches.length
      },
      message: `Found **${searches.length}** saved search(es).`
    };
  })
  .build();
