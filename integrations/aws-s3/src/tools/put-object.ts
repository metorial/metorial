import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { spec } from '../spec';

export let putObjectTool = SlateTool.create(spec, {
  name: 'Put Object',
  key: 'put_object',
  description: `Upload an object to an S3 bucket. Provide the content as text and specify the object key (path).
Supports optional settings for content type, storage class, encryption, access control, tags, and custom metadata.`,
  constraints: [
    'Content must be provided as text. For binary uploads, use presigned URLs.',
    'Maximum inline upload size is limited by text encoding. For files over 5 GB, multipart upload is required (not supported inline).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      bucketName: z.string().describe('Name of the S3 bucket'),
      objectKey: z.string().describe('Key (path) for the object in the bucket'),
      content: z.string().describe('Text content to upload'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type of the content (e.g., "text/plain", "application/json")'),
      storageClass: z
        .enum([
          'STANDARD',
          'REDUCED_REDUNDANCY',
          'STANDARD_IA',
          'ONEZONE_IA',
          'INTELLIGENT_TIERING',
          'GLACIER',
          'DEEP_ARCHIVE',
          'GLACIER_IR'
        ])
        .optional()
        .describe('Storage class for the object'),
      serverSideEncryption: z
        .enum(['AES256', 'aws:kms'])
        .optional()
        .describe('Server-side encryption algorithm'),
      acl: z
        .enum([
          'private',
          'public-read',
          'public-read-write',
          'authenticated-read',
          'bucket-owner-read',
          'bucket-owner-full-control'
        ])
        .optional()
        .describe('Canned ACL for the object'),
      tagging: z
        .string()
        .optional()
        .describe('URL-encoded tag set (e.g., "key1=value1&key2=value2")'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs to attach to the object')
    })
  )
  .output(
    z.object({
      objectKey: z.string().describe('Key of the uploaded object'),
      eTag: z.string().describe('Entity tag (hash) of the uploaded object'),
      versionId: z
        .string()
        .optional()
        .describe('Version ID if versioning is enabled on the bucket'),
      bucketName: z.string().describe('Bucket the object was uploaded to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.putObject(
      ctx.input.bucketName,
      ctx.input.objectKey,
      ctx.input.content,
      {
        contentType: ctx.input.contentType,
        storageClass: ctx.input.storageClass,
        serverSideEncryption: ctx.input.serverSideEncryption,
        acl: ctx.input.acl,
        tagging: ctx.input.tagging,
        metadata: ctx.input.metadata
      }
    );

    return {
      output: {
        objectKey: ctx.input.objectKey,
        eTag: result.eTag,
        versionId: result.versionId,
        bucketName: ctx.input.bucketName
      },
      message: `Uploaded \`${ctx.input.objectKey}\` to \`${ctx.input.bucketName}\` (ETag: ${result.eTag}).`
    };
  })
  .build();
