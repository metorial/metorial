import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLibrary = SlateTool.create(spec, {
  name: 'Create Library',
  key: 'create_library',
  description: `Create a new reusable code library in RudderStack. Libraries are modular JavaScript or Python functions that can be imported into transformations via their auto-generated **importName** (camelCase of the library name).`,
  instructions: [
    'The importName is automatically generated from the library name in camelCase format. For example, "Cool Library" becomes "coolLibrary".',
    'Use "javascript" or "pythonfaas" as the language value.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('Name of the library. An importName will be auto-generated in camelCase.'),
      code: z.string().describe('Library code with exported functions'),
      language: z
        .enum(['javascript', 'pythonfaas'])
        .describe('Programming language: "javascript" or "pythonfaas" (Python)'),
      description: z.string().optional().describe('Description of the library'),
      publish: z
        .boolean()
        .optional()
        .describe(
          'Publish this new library revision. Defaults to false; publishing can affect transformations that import this library.'
        )
    })
  )
  .output(
    z.object({
      libraryId: z.string().describe('Unique identifier of the created library'),
      versionId: z.string().describe('Version identifier of the created library'),
      name: z.string().describe('Name of the library'),
      importName: z
        .string()
        .nullable()
        .describe(
          'Auto-generated camelCase name used to import the library in transformations'
        ),
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

    let result = await client.createLibrary({
      name: ctx.input.name,
      code: ctx.input.code,
      language: ctx.input.language,
      description: ctx.input.description,
      publish: ctx.input.publish
    });

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
      message: `Created library **${result.name}** (ID: \`${result.id}\`, importName: \`${result.importName ?? 'N/A'}\`).`
    };
  })
  .build();
