import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

export let newAttachment = SlateTrigger.create(spec, {
  name: 'New Attachment Created',
  key: 'new_attachment',
  description:
    'Triggers when a new social unlock or contest attachment is created. Polls both unlock and contest types for new additions.'
})
  .input(
    z.object({
      attachmentId: z.number().describe('Attachment ID'),
      type: z.string().describe('Attachment type (unlock or contest)'),
      title: z.string().optional().describe('Attachment title'),
      linkPath: z.string().optional().describe('URL path')
    })
  )
  .output(
    z.object({
      attachmentId: z.number().describe('Attachment ID'),
      type: z.string().describe('Attachment type (unlock or contest)'),
      title: z.string().optional().describe('Attachment title'),
      linkPath: z.string().optional().describe('URL path'),
      artworkUrl: z.string().optional().describe('Artwork URL'),
      message: z.string().optional().describe('Landing page message')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ToneDenClient({ token: ctx.auth.token });

      let knownIds: number[] = ctx.state?.knownAttachmentIds || [];
      let inputs: any[] = [];
      let allCurrentIds: number[] = [];

      for (let type of ['unlock', 'contest'] as const) {
        try {
          let attachments = await client.listAttachments('me', { type, limit: 50 });
          for (let a of attachments || []) {
            allCurrentIds.push(a.id);
            if (!knownIds.includes(a.id)) {
              inputs.push({
                attachmentId: a.id,
                type: a.type,
                title: a.title,
                linkPath: a.link_path
              });
            }
          }
        } catch {
          // Skip if a type is not accessible
        }
      }

      return {
        inputs,
        updatedState: {
          knownAttachmentIds: [...new Set([...knownIds, ...allCurrentIds])]
        }
      };
    },

    handleEvent: async ctx => {
      let client = new ToneDenClient({ token: ctx.auth.token });

      let attachment: any = {};
      try {
        attachment = await client.getAttachment(ctx.input.attachmentId);
      } catch {
        // Use polling data if fetch fails
      }

      return {
        type: `attachment.created`,
        id: `attachment-${ctx.input.attachmentId}`,
        output: {
          attachmentId: ctx.input.attachmentId,
          type: attachment?.type || ctx.input.type,
          title: attachment?.title || ctx.input.title,
          linkPath: attachment?.link_path || ctx.input.linkPath,
          artworkUrl: attachment?.artwork_url,
          message: attachment?.message
        }
      };
    }
  })
  .build();
