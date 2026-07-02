import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudStorageActionScopes } from '../scopes';
import { spec } from '../spec';

export let uploadObject = SlateTool.create(spec, {
  name: 'Upload Object',
  key: 'upload_object',
  description: `Upload a new object to a Cloud Storage bucket or overwrite an existing one. Provide the object name (path) and its text content. Optionally attach custom metadata key-value pairs.`,
  instructions: [
    'The object name can include "/" characters to simulate folder structure (e.g., "images/photo.jpg").'
  ]
})
  .scopes(googleCloudStorageActionScopes.uploadObject)
  .input(
    z.object({
      bucketName: z.string().describe('Name of the bucket to upload to'),
      objectName: z.string().describe('Full name (path) for the object in the bucket'),
      content: z.string().describe('Text content of the object'),
      contentType: z
        .string()
        .optional()
        .describe(
          'MIME type (e.g., "text/plain", "application/json"). Defaults to "application/octet-stream".'
        ),
      customMetadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata to attach to the object')
    })
  )
  .output(
    z.object({
      objectName: z.string(),
      bucketName: z.string(),
      sizeBytes: z.string().optional(),
      contentType: z.string().optional(),
      generation: z.string().optional(),
      md5Hash: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.uploadObject(
      ctx.input.bucketName,
      ctx.input.objectName,
      ctx.input.content,
      {
        contentType: ctx.input.contentType,
        metadata: ctx.input.customMetadata
      }
    );

    return {
      output: {
        objectName: result.name,
        bucketName: result.bucket,
        sizeBytes: result.size,
        contentType: result.contentType,
        generation: result.generation,
        md5Hash: result.md5Hash,
        createdAt: result.timeCreated
      },
      message: `Uploaded object **${result.name}** to bucket **${result.bucket}** (${result.size} bytes, ${result.contentType}).`
    };
  })
  .build();
