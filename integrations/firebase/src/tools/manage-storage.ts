import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { StorageClient } from '../lib/client';
import { firebaseServiceError, missingRequiredFieldError } from '../lib/errors';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

let storageObjectSchema = z.object({
  objectName: z.string().describe('Full object path/name in the bucket'),
  bucket: z.string().describe('Storage bucket name'),
  contentType: z.string().optional().describe('MIME content type'),
  size: z.string().optional().describe('Object size in bytes'),
  timeCreated: z.string().optional().describe('Creation timestamp'),
  updated: z.string().optional().describe('Last updated timestamp'),
  md5Hash: z.string().optional().describe('MD5 hash of the object'),
  mediaLink: z.string().optional().describe('Direct download link'),
  selfLink: z.string().optional().describe('API self link'),
  generation: z.string().optional().describe('Object generation number')
});

export let manageStorage = SlateTool.create(spec, {
  name: 'Manage Cloud Storage',
  key: 'manage_storage',
  description: `List, upload, get metadata, delete, or copy objects in Firebase Cloud Storage. Supports prefix-based listing for browsing folder-like structures, fetching download URLs, and copying objects between paths.`,
  instructions: [
    '"list" shows objects in a bucket, optionally filtered by prefix.',
    '"upload" stores base64-encoded content at an object path.',
    '"get" retrieves metadata and download URL for a specific object.',
    '"delete" removes an object from storage.',
    '"copy" copies an object to a new location (same or different bucket).',
    "The bucket defaults to your project's default Firebase Storage bucket (<projectId>.appspot.com)."
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(firebaseActionScopes.manageStorage)
  .input(
    z.object({
      operation: z
        .enum(['list', 'upload', 'get', 'delete', 'copy'])
        .describe('Operation to perform'),
      bucket: z
        .string()
        .optional()
        .describe('Storage bucket name. Defaults to <projectId>.appspot.com.'),
      objectPath: z
        .string()
        .optional()
        .describe('Full object path (required for upload, get, delete, copy)'),
      contentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded object content. Required for upload.'),
      contentType: z
        .string()
        .optional()
        .describe('MIME content type to set when uploading an object.'),
      prefix: z
        .string()
        .optional()
        .describe('Prefix filter for listing objects (acts like folder path)'),
      delimiter: z
        .string()
        .optional()
        .describe('Delimiter for listing, typically "/" to list folder-like structure'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum objects to return in list. Defaults to 100.'),
      pageToken: z.string().optional().describe('Page token for list continuation'),
      destinationBucket: z
        .string()
        .optional()
        .describe('Destination bucket for copy. Defaults to source bucket.'),
      destinationObjectPath: z
        .string()
        .optional()
        .describe('Destination object path for copy'),
      customMetadata: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom metadata to set on the object (upload and get operation also update if provided)'
        )
    })
  )
  .output(
    z.object({
      objects: z.array(storageObjectSchema).optional().describe('Listed objects'),
      prefixes: z.array(z.string()).optional().describe('Common prefixes (folders) found'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page'),
      object: storageObjectSchema.optional().describe('Single object metadata'),
      downloadUrl: z.string().optional().describe('Direct download URL'),
      deleted: z.boolean().optional().describe('Whether the object was deleted'),
      copied: z.boolean().optional().describe('Whether the object was copied')
    })
  )
  .handleInvocation(async ctx => {
    let bucket =
      ctx.input.bucket || ctx.config.storageBucket || `${ctx.config.projectId}.appspot.com`;
    let client = new StorageClient({
      token: ctx.auth.token,
      bucket
    });

    let { operation, objectPath } = ctx.input;

    if (operation === 'list') {
      let result = await client.listObjects({
        prefix: ctx.input.prefix,
        delimiter: ctx.input.delimiter,
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken
      });

      return {
        output: {
          objects: result.objects,
          prefixes: result.prefixes,
          nextPageToken: result.nextPageToken
        },
        message: `Listed **${result.objects.length}** object(s) in bucket \`${bucket}\`.${result.nextPageToken ? ' More results available.' : ''}`
      };
    }

    if (operation === 'upload') {
      if (!objectPath) throw missingRequiredFieldError('objectPath', 'upload');
      if (!ctx.input.contentBase64) throw missingRequiredFieldError('contentBase64', 'upload');

      let uploaded = await client.uploadObject({
        objectPath,
        contentBase64: ctx.input.contentBase64,
        contentType: ctx.input.contentType,
        customMetadata: ctx.input.customMetadata
      });

      return {
        output: {
          object: uploaded
        },
        message: `Uploaded **${objectPath}** to bucket \`${bucket}\`.`
      };
    }

    if (operation === 'get') {
      if (!objectPath) throw missingRequiredFieldError('objectPath', 'get');

      if (ctx.input.customMetadata) {
        let updated = await client.updateObjectMetadata(objectPath, ctx.input.customMetadata);
        let downloadUrl = await client.getDownloadUrl(objectPath);
        return {
          output: {
            object: updated,
            downloadUrl
          },
          message: `Updated metadata and retrieved object **${objectPath}**.`
        };
      }

      let metadata = await client.getObjectMetadata(objectPath);
      let downloadUrl = await client.getDownloadUrl(objectPath);

      return {
        output: {
          object: metadata,
          downloadUrl
        },
        message: `Retrieved metadata for **${objectPath}** (${metadata.contentType || 'unknown type'}, ${metadata.size || '?'} bytes).`
      };
    }

    if (operation === 'delete') {
      if (!objectPath) throw missingRequiredFieldError('objectPath', 'delete');
      await client.deleteObject(objectPath);
      return {
        output: { deleted: true },
        message: `Deleted **${objectPath}** from bucket \`${bucket}\`.`
      };
    }

    if (operation === 'copy') {
      if (!objectPath) throw missingRequiredFieldError('objectPath', 'copy');
      if (!ctx.input.destinationObjectPath)
        throw missingRequiredFieldError('destinationObjectPath', 'copy');

      let destBucket = ctx.input.destinationBucket || bucket;
      let copiedObject = await client.copyObject(
        objectPath,
        destBucket,
        ctx.input.destinationObjectPath
      );

      return {
        output: {
          object: copiedObject,
          copied: true
        },
        message: `Copied **${objectPath}** to **${ctx.input.destinationObjectPath}** in bucket \`${destBucket}\`.`
      };
    }

    throw firebaseServiceError(`Unknown operation: ${operation}`);
  })
  .build();
