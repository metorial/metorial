import { SlateTool } from 'slates';
import { z } from 'zod';
import { SanityClient } from '../lib/client';
import { spec } from '../spec';

let _patchOperationsSchema = z
  .object({
    set: z
      .record(z.string(), z.any())
      .optional()
      .describe('Set field values. Overwrites existing values.'),
    setIfMissing: z
      .record(z.string(), z.any())
      .optional()
      .describe('Set field values only if they do not already exist.'),
    unset: z.array(z.string()).optional().describe('Remove fields by their paths.'),
    inc: z
      .record(z.string(), z.number())
      .optional()
      .describe('Increment numeric fields by the given amounts.'),
    dec: z
      .record(z.string(), z.number())
      .optional()
      .describe('Decrement numeric fields by the given amounts.'),
    insert: z
      .object({
        before: z.string().optional().describe('Insert before this path.'),
        after: z.string().optional().describe('Insert after this path.'),
        replace: z.string().optional().describe('Replace items at this path.'),
        items: z.array(z.any()).describe('Items to insert.')
      })
      .optional()
      .describe('Insert items into arrays.'),
    ifRevisionID: z
      .string()
      .optional()
      .describe(
        'Only apply patch if the document is at this revision. Enables optimistic locking.'
      )
  })
  .describe('Patch operations to apply to the document.');

let mutationSchema = z.object({
  create: z
    .object({
      _id: z.string().optional().describe('Document ID. Auto-generated if omitted.'),
      _type: z.string().describe('Document type.')
    })
    .passthrough()
    .optional()
    .describe('Create a new document. Fails if a document with the same ID already exists.'),

  createOrReplace: z
    .object({
      _id: z.string().describe('Document ID. Required for createOrReplace.'),
      _type: z.string().describe('Document type.')
    })
    .passthrough()
    .optional()
    .describe('Create a new document or fully replace an existing one.'),

  createIfNotExists: z
    .object({
      _id: z.string().describe('Document ID. Required for createIfNotExists.'),
      _type: z.string().describe('Document type.')
    })
    .passthrough()
    .optional()
    .describe('Create a document only if it does not already exist.'),

  delete: z
    .object({
      documentId: z.string().optional().describe('ID of the document to delete.'),
      query: z.string().optional().describe('GROQ query to match documents for deletion.'),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe('Parameters for the GROQ deletion query.')
    })
    .optional()
    .describe('Delete a document by ID or by GROQ query.'),

  patch: z
    .object({
      documentId: z.string().optional().describe('ID of the document to patch.'),
      query: z.string().optional().describe('GROQ query to match documents for patching.'),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe('Parameters for the GROQ patch query.'),
      set: z.record(z.string(), z.any()).optional().describe('Set field values.'),
      setIfMissing: z
        .record(z.string(), z.any())
        .optional()
        .describe('Set field values only if they do not already exist.'),
      unset: z.array(z.string()).optional().describe('Remove fields by their paths.'),
      inc: z.record(z.string(), z.number()).optional().describe('Increment numeric fields.'),
      dec: z.record(z.string(), z.number()).optional().describe('Decrement numeric fields.'),
      ifRevisionID: z
        .string()
        .optional()
        .describe('Only apply patch if the document is at this revision.')
    })
    .optional()
    .describe('Patch an existing document with targeted updates.')
});

export let mutateDocuments = SlateTool.create(spec, {
  name: 'Mutate Documents',
  key: 'mutate_documents',
  description: `Create, update, patch, or delete documents in a Sanity dataset. Supports multiple mutations in a single atomic transaction. Each mutation in the array can be a create, createOrReplace, createIfNotExists, delete, or patch operation.`,
  instructions: [
    'Each item in the mutations array should have exactly one operation key: create, createOrReplace, createIfNotExists, delete, or patch.',
    'All mutations in a single call are executed as an atomic transaction — either all succeed or none are applied.',
    'For patch operations, you can target a single document by documentId or multiple documents by GROQ query.',
    'For delete operations, the API expects an "id" field — the tool maps "documentId" to "id" automatically.'
  ],
  constraints: ['Delete queries are limited to 10,000 documents maximum.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      mutations: z
        .array(mutationSchema)
        .describe('Array of mutation operations to execute as a single transaction.'),
      returnDocuments: z
        .boolean()
        .optional()
        .describe('If true, returns the full content of changed documents in the response.'),
      dryRun: z
        .boolean()
        .optional()
        .describe('If true, validates the mutations without actually executing them.'),
      autoGenerateArrayKeys: z
        .boolean()
        .optional()
        .describe('If true, automatically adds _key attributes to array items.')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('ID of the completed transaction.'),
      results: z
        .array(
          z.object({
            operation: z.string().describe('The mutation operation that was performed.'),
            documentId: z.string().optional().describe('ID of the affected document.'),
            document: z
              .any()
              .optional()
              .describe('Full document content (only if returnDocuments was true).')
          })
        )
        .describe('Results for each mutation in the transaction.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SanityClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      dataset: ctx.config.dataset,
      apiVersion: ctx.config.apiVersion
    });

    // Map user-friendly field names to API field names
    let apiMutations = ctx.input.mutations.map(m => {
      let mapped: Record<string, any> = {};
      if (m.create) mapped.create = m.create;
      if (m.createOrReplace) mapped.createOrReplace = m.createOrReplace;
      if (m.createIfNotExists) mapped.createIfNotExists = m.createIfNotExists;
      if (m.delete) {
        mapped.delete = {
          ...(m.delete.documentId ? { id: m.delete.documentId } : {}),
          ...(m.delete.query ? { query: m.delete.query } : {}),
          ...(m.delete.params ? { params: m.delete.params } : {})
        };
      }
      if (m.patch) {
        let { documentId, ...rest } = m.patch;
        mapped.patch = {
          ...(documentId ? { id: documentId } : {}),
          ...rest
        };
      }
      return mapped;
    });

    let response = await client.mutate(apiMutations, {
      returnIds: true,
      returnDocuments: ctx.input.returnDocuments,
      dryRun: ctx.input.dryRun,
      autoGenerateArrayKeys: ctx.input.autoGenerateArrayKeys
    });

    let mutationCount = ctx.input.mutations.length;
    let dryRunLabel = ctx.input.dryRun ? ' (dry run)' : '';

    return {
      output: {
        transactionId: response.transactionId,
        results: response.results || []
      },
      message: `Executed ${mutationCount} mutation(s)${dryRunLabel}. Transaction ID: \`${response.transactionId}\`.`
    };
  })
  .build();
