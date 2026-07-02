import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLibrary = SlateTool.create(spec, {
  name: 'Get Library',
  key: 'get_library',
  description: `Retrieve a specific reusable code library by its ID. Returns the library's code, importName, version, and metadata.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      libraryId: z.string().describe('ID of the library to retrieve')
    })
  )
  .output(
    z.object({
      libraryId: z.string().describe('Unique identifier of the library'),
      versionId: z.string().describe('Current version identifier'),
      name: z.string().describe('Name of the library'),
      importName: z.string().nullable().describe('Auto-generated camelCase import name'),
      description: z.string().nullable().describe('Description of the library'),
      code: z.string().describe('Library code'),
      language: z.string().describe('Programming language used'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getLibrary(ctx.input.libraryId);

    return {
      output: {
        libraryId: result.id,
        versionId: result.versionId,
        name: result.name,
        importName: result.importName ?? null,
        description: result.description ?? null,
        code: result.code,
        language: result.language,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Retrieved library **${result.name}** (ID: \`${result.id}\`, importName: \`${result.importName ?? 'N/A'}\`).`
    };
  })
  .build();
