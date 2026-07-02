import { SlateTool } from 'slates';
import { z } from 'zod';
import { MigrationApiClient } from '../lib/client';
import { spec } from '../spec';

let migrationDocumentOutputSchema = z.object({
  documentId: z.string().describe('ID of the created or updated document'),
  title: z.string().describe('Document title'),
  type: z.string().describe('Document type'),
  lang: z.string().describe('Language code'),
  uid: z.string().optional().describe('Document UID if set')
});

export let createMigrationDocument = SlateTool.create(spec, {
  name: 'Create Migration Document',
  key: 'create_migration_document',
  description: `Create a new document via the Migration API. Documents are created as drafts in a migration release and must be published through the Prismic UI.
Requires a Migration API token.`,
  constraints: [
    'Documents are created as drafts — they cannot be published programmatically.',
    'Created documents are added to a migration release by default.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Document title'),
      type: z.string().describe('Custom type ID for the document'),
      uid: z.string().optional().describe('User-friendly unique identifier'),
      lang: z
        .string()
        .optional()
        .describe('Language code (defaults to repository master locale)'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the document'),
      alternateLanguageDocumentId: z
        .string()
        .optional()
        .describe('ID of existing document to link as an alternate language'),
      data: z
        .record(z.string(), z.any())
        .describe('Document field data matching the custom type schema')
    })
  )
  .output(migrationDocumentOutputSchema)
  .handleInvocation(async ctx => {
    if (!ctx.auth.migrationToken) {
      throw new Error('Migration API token is required for creating migration documents.');
    }

    let client = new MigrationApiClient({
      repositoryName: ctx.config.repositoryName,
      migrationToken: ctx.auth.migrationToken
    });

    let result = await client.createDocument({
      title: ctx.input.title,
      type: ctx.input.type,
      uid: ctx.input.uid,
      lang: ctx.input.lang,
      tags: ctx.input.tags,
      alternate_language_id: ctx.input.alternateLanguageDocumentId,
      data: ctx.input.data
    });

    return {
      output: {
        documentId: result.id,
        title: result.title,
        type: result.type,
        lang: result.lang,
        uid: result.uid
      },
      message: `Created draft document **${result.title}** (${result.id}, type: ${result.type}). Publish via the Prismic UI.`
    };
  })
  .build();

export let updateMigrationDocument = SlateTool.create(spec, {
  name: 'Update Migration Document',
  key: 'update_migration_document',
  description: `Update an existing document via the Migration API. Changes are saved as drafts in a migration release and must be published through the Prismic UI.
Requires a Migration API token.`,
  constraints: [
    'Changes are saved as drafts — they cannot be published programmatically.',
    'Updates are added to a migration release by default.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to update'),
      title: z.string().describe('Updated document title'),
      type: z.string().describe('Custom type ID for the document'),
      uid: z.string().optional().describe('Updated UID'),
      lang: z.string().optional().describe('Language code'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      alternateLanguageDocumentId: z
        .string()
        .optional()
        .describe('ID of existing document to link as alternate language'),
      data: z.record(z.string(), z.any()).describe('Updated document field data')
    })
  )
  .output(migrationDocumentOutputSchema)
  .handleInvocation(async ctx => {
    if (!ctx.auth.migrationToken) {
      throw new Error('Migration API token is required for updating migration documents.');
    }

    let client = new MigrationApiClient({
      repositoryName: ctx.config.repositoryName,
      migrationToken: ctx.auth.migrationToken
    });

    let result = await client.updateDocument(ctx.input.documentId, {
      title: ctx.input.title,
      type: ctx.input.type,
      uid: ctx.input.uid,
      lang: ctx.input.lang,
      tags: ctx.input.tags,
      alternate_language_id: ctx.input.alternateLanguageDocumentId,
      data: ctx.input.data
    });

    return {
      output: {
        documentId: result.id,
        title: result.title,
        type: result.type,
        lang: result.lang,
        uid: result.uid
      },
      message: `Updated draft document **${result.title}** (${result.id}). Publish via the Prismic UI.`
    };
  })
  .build();
