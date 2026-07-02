import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendPush = SlateTool.create(spec, {
  name: 'Send Push',
  key: 'send_push',
  description: `Send a push notification to your devices, another user, or a channel. Supports three push types: **note** (text message), **link** (URL with optional message), and **file** (previously uploaded file with optional message).
Pushes can be targeted to a specific device, an email address, or a channel tag. If no target is specified, the push is broadcast to all of the sender's devices.`,
  instructions: [
    'For file pushes, you must first upload the file using the Request File Upload tool, then use the returned file URL, name, and type here.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      type: z.enum(['note', 'link', 'file']).describe('Type of push to send'),
      title: z.string().optional().describe('Title of the push (for note and link types)'),
      body: z.string().optional().describe('Body text of the push'),
      url: z.string().optional().describe('URL to include (required for link type)'),
      fileName: z.string().optional().describe('Name of the file (required for file type)'),
      fileType: z
        .string()
        .optional()
        .describe('MIME type of the file (required for file type)'),
      fileUrl: z
        .string()
        .optional()
        .describe('URL of the uploaded file (required for file type)'),
      targetDeviceIden: z
        .string()
        .optional()
        .describe('Device identifier to send the push to'),
      targetEmail: z.string().optional().describe('Email address to send the push to'),
      channelTag: z
        .string()
        .optional()
        .describe('Channel tag to send the push to all subscribers')
    })
  )
  .output(
    z.object({
      pushIden: z.string().describe('Unique identifier of the created push'),
      type: z.string().describe('Type of the push'),
      title: z.string().optional().describe('Title of the push'),
      body: z.string().optional().describe('Body text of the push'),
      url: z.string().optional().describe('URL of the push (link type)'),
      fileName: z.string().optional().describe('Name of the attached file'),
      fileUrl: z.string().optional().describe('URL of the attached file'),
      senderName: z.string().optional().describe('Name of the sender'),
      senderEmail: z.string().optional().describe('Email of the sender'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let push = await client.createPush({
      type: ctx.input.type,
      title: ctx.input.title,
      body: ctx.input.body,
      url: ctx.input.url,
      fileName: ctx.input.fileName,
      fileType: ctx.input.fileType,
      fileUrl: ctx.input.fileUrl,
      deviceIden: ctx.input.targetDeviceIden,
      email: ctx.input.targetEmail,
      channelTag: ctx.input.channelTag
    });

    let target = ctx.input.targetDeviceIden
      ? `device \`${ctx.input.targetDeviceIden}\``
      : ctx.input.targetEmail
        ? ctx.input.targetEmail
        : ctx.input.channelTag
          ? `channel #${ctx.input.channelTag}`
          : 'all devices';

    return {
      output: {
        pushIden: push.iden,
        type: push.type,
        title: push.title,
        body: push.body,
        url: push.url,
        fileName: push.file_name,
        fileUrl: push.file_url,
        senderName: push.sender_name,
        senderEmail: push.sender_email,
        created: String(push.created)
      },
      message: `Sent **${push.type}** push${push.title ? ` "${push.title}"` : ''} to ${target}.`
    };
  })
  .build();
