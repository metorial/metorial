import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudFunctionsActionScopes } from '../scopes';
import { spec } from '../spec';

export let generateUploadUrl = SlateTool.create(spec, {
  name: 'Generate Upload URL',
  key: 'generate_upload_url',
  description: `Generate a signed URL for uploading function source code to Cloud Storage. The returned URL and storage source should be used when creating or updating a function. Upload your source code archive (ZIP) to the signed URL before referencing it in a create or update call.`,
  instructions: [
    'After obtaining the upload URL, upload your source code ZIP archive to it using an HTTP PUT request with Content-Type: application/zip.',
    'Then use the returned storageSource in the create or update function call.'
  ],
  tags: {
    readOnly: false
  }
})
  .scopes(googleCloudFunctionsActionScopes.generateUploadUrl)
  .input(
    z.object({
      location: z
        .string()
        .optional()
        .describe('Region for the upload. Defaults to configured region.'),
      kmsKeyName: z.string().optional().describe('KMS key name for encryption'),
      environment: z
        .enum(['GEN_1', 'GEN_2'])
        .optional()
        .describe('Target function environment')
    })
  )
  .output(
    z.object({
      uploadUrl: z.string().describe('Signed URL to upload source code via HTTP PUT'),
      storageSource: z
        .object({
          bucket: z.string().optional().describe('Cloud Storage bucket name'),
          object: z.string().optional().describe('Cloud Storage object path'),
          generation: z.string().optional().describe('Cloud Storage object generation')
        })
        .optional()
        .describe('Storage source reference to use when creating/updating the function')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.input.location || ctx.config.region
    });

    let response = await client.generateUploadUrl({
      kmsKeyName: ctx.input.kmsKeyName,
      environment: ctx.input.environment
    });

    return {
      output: {
        uploadUrl: response.uploadUrl,
        storageSource: response.storageSource
      },
      message: `Upload URL generated. Upload your source archive (ZIP) to the URL, then use the storage source reference when creating or updating your function.`
    };
  })
  .build();
