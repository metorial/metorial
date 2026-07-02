import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let librarySchema = z.object({
  libraryId: z.string().describe('Unique identifier of the library'),
  versionId: z.string().describe('Current version identifier'),
  name: z.string().describe('Name of the library'),
  importName: z.string().nullable().describe('Auto-generated camelCase import name'),
  description: z.string().nullable().describe('Description of the library'),
  language: z.string().describe('Programming language used'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listLibraries = SlateTool.create(spec, {
  name: 'List Libraries',
  key: 'list_libraries',
  description: `List all reusable code libraries in the workspace. Returns each library's metadata including name, importName, language, and timestamps. Does not include the full code — use **Get Library** to retrieve the code for a specific library.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      libraries: z.array(librarySchema).describe('List of libraries in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listLibraries();
    let libraries = result.libraries ?? result ?? [];
    let items = (Array.isArray(libraries) ? libraries : []).map((l: any) => ({
      libraryId: l.id,
      versionId: l.versionId,
      name: l.name,
      importName: l.importName ?? null,
      description: l.description ?? null,
      language: l.language,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt
    }));

    return {
      output: { libraries: items },
      message: `Found **${items.length}** library/libraries.`
    };
  })
  .build();
