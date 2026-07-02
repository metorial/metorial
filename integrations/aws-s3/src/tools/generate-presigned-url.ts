import { SlateTool } from 'slates';
import { z } from 'zod';
import { S3Client } from '../lib/client';
import { spec } from '../spec';

export let generatePresignedUrlTool = SlateTool.create(spec, {
  name: 'Generate Presigned URL',
  key: 'generate_presigned_url',
  description: `Generate a presigned URL for temporary access to an S3 object. The URL includes authentication in the query string so it can be shared without credentials.
Use **GET** for downloads and **PUT** for uploads. URLs are valid for a configurable duration (default 1 hour, max 7 days).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bucketName: z.string().describe('Name of the S3 bucket'),
      objectKey: z.string().describe('Key (path) of the object'),
      method: z
        .enum(['GET', 'PUT'])
        .optional()
        .describe(
          'HTTP method for the presigned URL (default GET for download, PUT for upload)'
        ),
      expiresInSeconds: z
        .number()
        .int()
        .min(1)
        .max(604800)
        .optional()
        .describe('URL validity in seconds (default 3600, max 604800 for 7 days)'),
      versionId: z.string().optional().describe('Specific version ID for versioned objects'),
      contentType: z.string().optional().describe('Expected content type for PUT uploads')
    })
  )
  .output(
    z.object({
      presignedUrl: z.string().describe('The generated presigned URL'),
      method: z.string().describe('HTTP method the URL is valid for'),
      expiresInSeconds: z.number().describe('How long the URL remains valid'),
      objectKey: z.string().describe('Object key the URL provides access to'),
      bucketName: z.string().describe('Bucket the URL provides access to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new S3Client({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let method = ctx.input.method || 'GET';
    let expiresInSeconds = ctx.input.expiresInSeconds || 3600;

    let presignedUrl = await client.generatePresignedUrl(
      ctx.input.bucketName,
      ctx.input.objectKey,
      {
        method,
        expiresInSeconds,
        versionId: ctx.input.versionId,
        contentType: ctx.input.contentType
      }
    );

    return {
      output: {
        presignedUrl,
        method,
        expiresInSeconds,
        objectKey: ctx.input.objectKey,
        bucketName: ctx.input.bucketName
      },
      message: `Generated **${method}** presigned URL for \`${ctx.input.objectKey}\` in \`${ctx.input.bucketName}\` (valid for ${expiresInSeconds}s).`
    };
  })
  .build();
