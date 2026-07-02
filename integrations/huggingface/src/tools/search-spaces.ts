import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
import { spec } from '../spec';

let spaceSchema = z.object({
  spaceId: z.string().describe('Full space ID (e.g. "username/space-name")'),
  author: z.string().optional().describe('Author/owner of the space'),
  sha: z.string().optional().describe('Latest commit SHA'),
  lastModified: z.string().optional().describe('Last modification timestamp'),
  private: z.boolean().optional().describe('Whether the space is private'),
  likes: z.number().optional().describe('Number of likes'),
  tags: z.array(z.string()).optional().describe('Tags on the space'),
  sdk: z.string().optional().describe('SDK used (e.g. "gradio", "streamlit", "docker")')
});

export let searchSpacesTool = SlateTool.create(spec, {
  name: 'Search Spaces',
  key: 'search_spaces',
  description: `Search for Spaces (ML application demos) on Hugging Face Hub. Filter by keyword, author, and tags. Results include Space metadata such as SDK type and likes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter spaces by name or description'),
      author: z.string().optional().describe('Filter by author/organization'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      sort: z
        .enum(['likes', 'lastModified', 'trending', 'createdAt'])
        .optional()
        .describe('Sort field'),
      direction: z
        .enum(['-1', '1'])
        .optional()
        .describe('Sort direction: -1 for descending, 1 for ascending'),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of results (default 20)')
    })
  )
  .output(
    z.object({
      spaces: z.array(spaceSchema).describe('List of matching spaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let results = await client.searchSpaces({
      search: ctx.input.search,
      author: ctx.input.author,
      tags: ctx.input.tags,
      sort: ctx.input.sort,
      direction: ctx.input.direction,
      limit: ctx.input.limit
    });

    let spaces = results.map((s: any) => ({
      spaceId: s.id || s._id,
      author: s.author,
      sha: s.sha,
      lastModified: s.lastModified,
      private: s.private,
      likes: s.likes,
      tags: s.tags,
      sdk: s.sdk
    }));

    return {
      output: { spaces },
      message: `Found **${spaces.length}** space(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
