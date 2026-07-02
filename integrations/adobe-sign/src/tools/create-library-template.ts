import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLibraryTemplate = SlateTool.create(spec, {
  name: 'Create Library Template',
  key: 'create_library_template',
  description: `Create a reusable library document template with pre-configured form fields. Templates can be shared at the user, group, or account level and used as the basis for agreements, reducing repetitive setup.`,
  instructions: [
    'Upload the document first using the Upload Document tool, then reference the transientDocumentId.',
    'Template types determine how the template can be used: DOCUMENT for signing, FORM_FIELD_LAYER for reusable field layers.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the library template'),
      fileInfos: z
        .array(
          z.object({
            transientDocumentId: z
              .string()
              .describe('ID of a previously uploaded transient document')
          })
        )
        .describe('Documents to use in the template'),
      templateTypes: z
        .array(z.enum(['DOCUMENT', 'FORM_FIELD_LAYER']))
        .describe('Types of template to create'),
      sharingMode: z
        .enum(['USER', 'GROUP', 'ACCOUNT'])
        .optional()
        .describe('Sharing scope for the template. Defaults to user-level sharing.'),
      state: z
        .enum(['ACTIVE', 'AUTHORING'])
        .optional()
        .describe('Initial state of the template. Defaults to "ACTIVE".')
    })
  )
  .output(
    z.object({
      libraryDocumentId: z.string().describe('ID of the created library template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.createLibraryDocument({
      name: ctx.input.name,
      fileInfos: ctx.input.fileInfos,
      templateTypes: ctx.input.templateTypes,
      sharingMode: ctx.input.sharingMode,
      state: ctx.input.state
    });

    return {
      output: { libraryDocumentId: result.id },
      message: `Created library template **${ctx.input.name}** (\`${result.id}\`).`
    };
  });
