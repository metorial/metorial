import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactOutputSchema, formatContact } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

export let searchDirectory = SlateTool.create(spec, {
  name: 'Search Directory',
  key: 'search_directory',
  description: `Searches the Google Workspace domain directory for profiles and contacts matching a query. Only available for Google Workspace users with the \`directory.readonly\` scope. The domain admin must have enabled external contact and profile sharing.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleContactsActionScopes.searchDirectory)
  .input(
    z.object({
      query: z.string().describe('Search query to match against directory people'),
      sources: z
        .array(
          z.enum([
            'DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT',
            'DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'
          ])
        )
        .optional()
        .describe(
          'Directory sources to search (defaults to both domain contacts and profiles)'
        ),
      pageSize: z.number().optional().describe('Maximum number of results (default 30)'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      people: z.array(contactOutputSchema).describe('Matching directory people'),
      nextPageToken: z.string().optional().describe('Token for the next page'),
      totalSize: z.number().optional().describe('Total number of matching results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let sources = ctx.input.sources || [
      'DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT',
      'DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'
    ];

    let result = await client.searchDirectoryPeople({
      query: ctx.input.query,
      sources,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let people = (result.people || []).map(formatContact);

    return {
      output: {
        people,
        nextPageToken: result.nextPageToken,
        totalSize: result.totalSize
      },
      message: `Found **${people.length}** directory results matching "${ctx.input.query}".`
    };
  })
  .build();
