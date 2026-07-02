import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { requireTrelloString } from '../lib/errors';
import { spec } from '../spec';

let attachmentSchema = z.object({
  attachmentId: z.string().describe('Attachment ID'),
  name: z.string().optional().describe('Attachment name'),
  url: z.string().optional().describe('Attachment URL'),
  mimeType: z.string().optional().describe('MIME type'),
  bytes: z.number().optional().describe('Attachment size in bytes, when available'),
  date: z.string().optional().describe('When the attachment was added')
});

let mapAttachment = (attachment: any) => ({
  attachmentId: attachment.id,
  name: attachment.name || undefined,
  url: attachment.url || undefined,
  mimeType: attachment.mimeType || undefined,
  bytes: typeof attachment.bytes === 'number' ? attachment.bytes : undefined,
  date: attachment.date || undefined
});

export let manageAttachments = SlateTool.create(spec, {
  name: 'Manage Attachments',
  key: 'manage_attachments',
  description: `List, add URL attachments, or delete attachments on a Trello card. Use to inspect and manage external links attached to cards.`,
  instructions: [
    'Use action "list" with cardId to retrieve attachments.',
    'Use action "add_url" with cardId and url to attach a link.',
    'Use action "delete" with cardId and attachmentId to remove an attachment.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'add_url', 'delete']).describe('Action to perform'),
      cardId: z.string().optional().describe('Card ID (required for all actions)'),
      attachmentId: z.string().optional().describe('Attachment ID (required for delete)'),
      url: z.string().optional().describe('URL to attach (required for add_url)'),
      name: z.string().optional().describe('Display name for the attachment')
    })
  )
  .output(
    z.object({
      attachments: z.array(attachmentSchema).optional().describe('Attachments on the card'),
      attachment: attachmentSchema.optional().describe('Created attachment'),
      deleted: z.boolean().optional().describe('Whether a delete action completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });
    let { action } = ctx.input;
    let cardId = requireTrelloString(ctx.input.cardId, 'cardId', action);

    if (action === 'list') {
      let rawAttachments = await client.getAttachments(cardId);
      let attachments = rawAttachments.map(mapAttachment);

      return {
        output: { attachments },
        message: `Found **${attachments.length}** attachment(s).`
      };
    }

    if (action === 'add_url') {
      let url = requireTrelloString(ctx.input.url, 'url', action);
      let attachment = await client.addUrlAttachment(cardId, url, ctx.input.name);

      return {
        output: { attachment: mapAttachment(attachment) },
        message: `Added attachment **${attachment.name || url}** to card \`${cardId}\`.`
      };
    }

    let attachmentId = requireTrelloString(ctx.input.attachmentId, 'attachmentId', action);
    await client.deleteAttachment(cardId, attachmentId);

    return {
      output: { deleted: true },
      message: `Deleted attachment \`${attachmentId}\`.`
    };
  })
  .build();
