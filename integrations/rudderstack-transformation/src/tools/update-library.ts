import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLibrary = SlateTool.create(spec, {
  name: 'Update Library',
  key: 'update_library',
  description: `Update an existing reusable code library. You can modify the code, description, and optionally publish the updated version. Each update creates a new revision.
Set **publish** to true to make the updated code live.`,
  instructions: [
    'Only provide the fields you want to update.',
    'You cannot change the name or language of an existing library.'
  ],
  constraints: [
    'Library name cannot be changed after creation.',
    'Library language cannot be changed (JavaScript cannot be converted to Python and vice versa).'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      libraryId: z.string().describe('ID of the library to update'),
      code: z.string().optional().describe('Updated library code'),
      description: z.string().optional().describe('Updated description'),
      publish: z.boolean().optional().describe('If true, publishes the updated version')
    })
  )
  .output(
    z.object({
      libraryId: z.string().describe('Unique identifier of the library'),
      versionId: z.string().describe('New version identifier after update'),
      name: z.string().describe('Name of the library'),
      importName: z.string().nullable().describe('Auto-generated camelCase import name'),
      description: z.string().nullable().describe('Description of the library'),
      code: z.string().describe('Updated library code'),
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

    let result = await client.updateLibrary(ctx.input.libraryId, {
      code: ctx.input.code,
      description: ctx.input.description,
      publish: ctx.input.publish
    });

    let published = ctx.input.publish ? ' and published' : '';

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
      message: `Updated${published} library **${result.name}** (ID: \`${result.id}\`, version: \`${result.versionId}\`).`
    };
  })
  .build();
