import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { FirestoreClient } from '../lib/client';
import { firebaseServiceError, missingRequiredFieldError } from '../lib/errors';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageFirestoreDocument = SlateTool.create(spec, {
  name: 'Manage Firestore Document',
  key: 'manage_firestore_document',
  description: `Create, read, update, or delete a document in Cloud Firestore. Supports setting document fields with automatic type encoding and specifying update masks for partial updates.`,
  instructions: [
    'Use "create" to add a new document. Omit documentId to auto-generate one.',
    'Use "update" with updateFieldPaths to only update specific fields.',
    'Field values are automatically encoded to Firestore types (string, number, boolean, array, map, null).'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(firebaseActionScopes.manageFirestoreDocument)
  .input(
    z.object({
      operation: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('Operation to perform'),
      collectionPath: z
        .string()
        .describe('Path to the collection, e.g. "users" or "projects/abc/tasks"'),
      documentId: z
        .string()
        .optional()
        .describe(
          'Document ID. Required for get, update, delete. Optional for create (auto-generated if omitted).'
        ),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Document fields as key-value pairs. Required for create and update.'),
      updateFieldPaths: z
        .array(z.string())
        .optional()
        .describe(
          'For update: only update these specific field paths. If omitted, all provided fields are written.'
        ),
      databaseId: z
        .string()
        .optional()
        .describe('Firestore database ID. Defaults to "(default)".')
    })
  )
  .output(
    z.object({
      documentPath: z.string().optional().describe('Full resource path of the document'),
      documentId: z.string().optional().describe('The document ID'),
      fields: z.record(z.string(), z.any()).optional().describe('Decoded document fields'),
      createTime: z.string().optional().describe('Document creation timestamp'),
      updateTime: z.string().optional().describe('Document last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the document was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirestoreClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      databaseId: ctx.input.databaseId
    });

    let { operation, collectionPath, documentId, fields, updateFieldPaths } = ctx.input;

    if (operation === 'get') {
      if (!documentId) throw missingRequiredFieldError('documentId', 'get');
      let doc = await client.getDocument(collectionPath, documentId);
      return {
        output: {
          documentPath: doc.documentPath,
          documentId,
          fields: doc.fields,
          createTime: doc.createTime,
          updateTime: doc.updateTime
        },
        message: `Retrieved document **${documentId}** from \`${collectionPath}\`.`
      };
    }

    if (operation === 'create') {
      if (!fields) throw missingRequiredFieldError('fields', 'create');
      let doc = await client.createDocument(collectionPath, documentId, fields);
      return {
        output: {
          documentPath: doc.documentPath,
          documentId: doc.documentId,
          fields: doc.fields,
          createTime: doc.createTime,
          updateTime: doc.updateTime
        },
        message: `Created document **${doc.documentId}** in \`${collectionPath}\`.`
      };
    }

    if (operation === 'update') {
      if (!documentId) throw missingRequiredFieldError('documentId', 'update');
      if (!fields) throw missingRequiredFieldError('fields', 'update');
      let doc = await client.updateDocument(
        collectionPath,
        documentId,
        fields,
        updateFieldPaths
      );
      return {
        output: {
          documentPath: doc.documentPath,
          documentId,
          fields: doc.fields,
          updateTime: doc.updateTime
        },
        message: `Updated document **${documentId}** in \`${collectionPath}\`.`
      };
    }

    if (operation === 'delete') {
      if (!documentId) throw missingRequiredFieldError('documentId', 'delete');
      await client.deleteDocument(collectionPath, documentId);
      return {
        output: {
          documentId,
          deleted: true
        },
        message: `Deleted document **${documentId}** from \`${collectionPath}\`.`
      };
    }

    throw firebaseServiceError(`Unknown operation: ${operation}`);
  })
  .build();
