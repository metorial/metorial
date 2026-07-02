import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCall = SlateTool.create(spec, {
  name: 'Create Call',
  key: 'create_call',
  description: `Create a new call or meeting record in Leexi from an uploaded recording. The recording must first be uploaded using the presigned URL from the **Get Presigned Recording URL** tool. Call processing is asynchronous and typically takes a few minutes.`,
  instructions: [
    'First use "Get Presigned Recording URL" to get an upload URL, then upload your recording file via PUT to that URL.',
    'Use the returned S3 key as the "recordingS3Key" parameter.',
    'The "userUuid" must be a valid, licensed Leexi user. Use "List Users" to find available UUIDs.'
  ],
  constraints: [
    'Rate limited to 10 requests/minute for call creation.',
    'Recording must be uploaded before creating the call.',
    'Uploaded files expire after 3 days if not used.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      recordingS3Key: z
        .string()
        .describe('The S3 key returned by the presign recording URL endpoint'),
      externalId: z.string().describe('The ID of the call in your external system'),
      direction: z.enum(['inbound', 'outbound']).describe('Call direction'),
      performedAt: z.string().describe('When the call was performed in ISO 8601 format'),
      userUuid: z.string().describe('UUID of the Leexi user associated with the call'),
      title: z.string().optional().describe('Title of the call or meeting'),
      description: z.string().optional().describe('Description of the call'),
      locale: z
        .string()
        .optional()
        .describe('Language locale code (e.g., "en-US", "fr-FR", "de-DE")'),
      tags: z.array(z.string()).optional().describe('Array of tag names to apply to the call'),
      emails: z.array(z.string()).optional().describe('Email addresses of other participants'),
      rawPhoneNumber: z.string().optional().describe('Customer phone number')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the call creation was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.createCall(ctx.input);

    return {
      output: {
        success: true
      },
      message: `Call creation initiated for **${ctx.input.title || ctx.input.externalId}**. Processing is asynchronous and will take a few minutes.`
    };
  })
  .build();
