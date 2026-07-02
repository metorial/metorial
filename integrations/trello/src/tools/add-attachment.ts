import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

export let addAttachment = SlateTool.create(spec, {
  name: 'Add Attachment',
  key: 'add_attachment',
  description: `Add a URL attachment to a Trello card. Use to link external resources, documents, or files to a card.`
})
  .input(
    z.object({
      cardId: z.string().describe('ID of the card to attach to'),
      url: z.string().describe('URL to attach'),
      name: z.string().optional().describe('Display name for the attachment')
    })
  )
  .output(
    z.object({
      attachmentId: z.string().describe('Attachment ID'),
      name: z.string().optional().describe('Attachment name'),
      url: z.string().describe('Attachment URL'),
      cardId: z.string().describe('Card the attachment was added to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    let attachment = await client.addUrlAttachment(
      ctx.input.cardId,
      ctx.input.url,
      ctx.input.name
    );

    return {
      output: {
        attachmentId: attachment.id,
        name: attachment.name,
        url: attachment.url,
        cardId: ctx.input.cardId
      },
      message: `Added attachment **${attachment.name || ctx.input.url}** to card \`${ctx.input.cardId}\`.`
    };
  })
  .build();
