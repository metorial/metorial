import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newPush = SlateTrigger.create(spec, {
  name: 'New Push',
  key: 'new_push',
  description:
    'Triggers when a new push is received or created on the account. Detects notes, links, and file pushes.'
})
  .input(
    z.object({
      pushIden: z.string().describe('Unique identifier of the push'),
      type: z.string().describe('Type of push: note, link, or file'),
      direction: z.string().describe('Direction of the push: self, outgoing, or incoming'),
      title: z.string().optional().describe('Title of the push'),
      body: z.string().optional().describe('Body text of the push'),
      url: z.string().optional().describe('URL (for link pushes)'),
      fileName: z.string().optional().describe('File name (for file pushes)'),
      fileType: z.string().optional().describe('MIME type (for file pushes)'),
      fileUrl: z.string().optional().describe('File download URL (for file pushes)'),
      senderName: z.string().optional().describe('Name of the sender'),
      senderEmail: z.string().optional().describe('Email of the sender'),
      receiverEmail: z.string().optional().describe('Email of the receiver'),
      targetDeviceIden: z.string().optional().describe('Target device identifier'),
      created: z.number().describe('Creation Unix timestamp'),
      modified: z.number().describe('Modification Unix timestamp')
    })
  )
  .output(
    z.object({
      pushIden: z.string().describe('Unique identifier of the push'),
      type: z.string().describe('Type of push: note, link, or file'),
      direction: z.string().describe('Direction of the push: self, outgoing, or incoming'),
      title: z.string().optional().describe('Title of the push'),
      body: z.string().optional().describe('Body text of the push'),
      url: z.string().optional().describe('URL (for link pushes)'),
      fileName: z.string().optional().describe('File name (for file pushes)'),
      fileType: z.string().optional().describe('MIME type (for file pushes)'),
      fileUrl: z.string().optional().describe('File download URL (for file pushes)'),
      senderName: z.string().optional().describe('Name of the sender'),
      senderEmail: z.string().optional().describe('Email of the sender'),
      receiverEmail: z.string().optional().describe('Email of the receiver'),
      targetDeviceIden: z.string().optional().describe('Target device identifier'),
      created: z.string().describe('Creation Unix timestamp'),
      modified: z.string().describe('Last modification Unix timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastModified = ctx.state?.lastModified as string | undefined;

      let result = await client.listPushes({
        modifiedAfter: lastModified,
        active: true,
        limit: 100
      });

      let pushes = result.pushes || [];

      // Determine the newest modified timestamp for next poll
      let newestModified = lastModified;
      for (let push of pushes) {
        let mod = String(push.modified);
        if (!newestModified || mod > newestModified) {
          newestModified = mod;
        }
      }

      return {
        inputs: pushes.map(p => ({
          pushIden: p.iden,
          type: p.type,
          direction: p.direction,
          title: p.title,
          body: p.body,
          url: p.url,
          fileName: p.file_name,
          fileType: p.file_type,
          fileUrl: p.file_url,
          senderName: p.sender_name,
          senderEmail: p.sender_email,
          receiverEmail: p.receiver_email,
          targetDeviceIden: p.target_device_iden,
          created: p.created,
          modified: p.modified
        })),
        updatedState: {
          lastModified: newestModified
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `push.${ctx.input.type}`,
        id: ctx.input.pushIden,
        output: {
          pushIden: ctx.input.pushIden,
          type: ctx.input.type,
          direction: ctx.input.direction,
          title: ctx.input.title,
          body: ctx.input.body,
          url: ctx.input.url,
          fileName: ctx.input.fileName,
          fileType: ctx.input.fileType,
          fileUrl: ctx.input.fileUrl,
          senderName: ctx.input.senderName,
          senderEmail: ctx.input.senderEmail,
          receiverEmail: ctx.input.receiverEmail,
          targetDeviceIden: ctx.input.targetDeviceIden,
          created: String(ctx.input.created),
          modified: String(ctx.input.modified)
        }
      };
    }
  })
  .build();
