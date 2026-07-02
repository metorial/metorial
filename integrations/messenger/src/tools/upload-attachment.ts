import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { messengerServiceError } from '../lib/errors';
import { spec } from '../spec';

let isHttpsUrl = (value: string) => /^https:\/\//i.test(value);

export let uploadAttachment = SlateTool.create(spec, {
  name: 'Upload Attachment',
  key: 'upload_attachment',
  description:
    'Upload an image, video, audio file, or file URL to Messenger and receive a reusable attachment ID for later Send API calls.',
  instructions: [
    'Use this for media that will be sent repeatedly, or for media templates that require an attachment ID.',
    'The attachmentUrl must be publicly reachable over HTTPS so Meta can fetch it.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      attachmentType: z
        .enum(['image', 'video', 'audio', 'file'])
        .describe('Type of attachment to upload'),
      attachmentUrl: z
        .string()
        .refine(isHttpsUrl, 'attachmentUrl must be a public HTTPS URL')
        .describe('Public HTTPS URL of the attachment that Meta should fetch'),
      isReusable: z
        .boolean()
        .default(true)
        .describe('Whether Messenger should return a reusable attachment ID')
    })
  )
  .output(
    z.object({
      attachmentId: z.string().describe('Reusable Messenger attachment ID'),
      attachmentType: z.string().describe('Attachment type that was uploaded'),
      reusable: z.boolean().describe('Whether the uploaded attachment is reusable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      pageId: ctx.config.pageId,
      apiVersion: ctx.config.apiVersion
    });

    let attachment = await client.uploadAttachment({
      attachmentType: ctx.input.attachmentType,
      attachmentUrl: ctx.input.attachmentUrl,
      isReusable: ctx.input.isReusable
    });

    if (!attachment.attachmentId) {
      throw messengerServiceError('Messenger did not return an attachment ID');
    }

    return {
      output: attachment,
      message: `Uploaded **${attachment.attachmentType}** attachment for reuse (attachment ID: ${attachment.attachmentId}).`
    };
  })
  .build();
