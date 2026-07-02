import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  memberId: z.string().describe('Member ID'),
  fullName: z.string().optional().describe('Full name'),
  username: z.string().optional().describe('Username')
});

let attachmentSchema = z.object({
  attachmentId: z.string().describe('Attachment ID'),
  name: z.string().optional().describe('Attachment name'),
  url: z.string().optional().describe('Attachment URL'),
  mimeType: z.string().optional().describe('MIME type')
});

export let getCard = SlateTool.create(spec, {
  name: 'Get Card',
  key: 'get_card',
  description: `Get detailed information about a single Trello card, including its description, members, attachments, due dates, and labels.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cardId: z.string().describe('ID of the card to retrieve')
    })
  )
  .output(
    z.object({
      cardId: z.string().describe('Unique card ID'),
      name: z.string().describe('Card name'),
      description: z.string().optional().describe('Card description'),
      closed: z.boolean().describe('Whether the card is archived'),
      url: z.string().describe('Full URL to the card'),
      shortUrl: z.string().optional().describe('Short URL'),
      boardId: z.string().describe('Board ID'),
      listId: z.string().describe('List ID'),
      memberIds: z.array(z.string()).optional().describe('IDs of assigned members'),
      members: z.array(memberSchema).optional().describe('Assigned members'),
      labelIds: z.array(z.string()).optional().describe('IDs of applied labels'),
      due: z.string().optional().describe('Due date (ISO 8601)'),
      dueComplete: z.boolean().optional().describe('Whether the due date is marked complete'),
      start: z.string().optional().describe('Start date (ISO 8601)'),
      attachments: z.array(attachmentSchema).optional().describe('File attachments'),
      position: z.number().optional().describe('Card position within its list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    let card = await client.getCard(ctx.input.cardId);

    let members = card.members?.map((m: any) => ({
      memberId: m.id,
      fullName: m.fullName,
      username: m.username
    }));

    let attachments = card.attachments?.map((a: any) => ({
      attachmentId: a.id,
      name: a.name,
      url: a.url,
      mimeType: a.mimeType
    }));

    return {
      output: {
        cardId: card.id,
        name: card.name,
        description: card.desc || undefined,
        closed: card.closed ?? false,
        url: card.url,
        shortUrl: card.shortUrl,
        boardId: card.idBoard,
        listId: card.idList,
        memberIds: card.idMembers?.length ? card.idMembers : undefined,
        members: members?.length ? members : undefined,
        labelIds: card.idLabels?.length ? card.idLabels : undefined,
        due: card.due || undefined,
        dueComplete: card.dueComplete,
        start: card.start || undefined,
        attachments: attachments?.length ? attachments : undefined,
        position: card.pos
      },
      message: `Retrieved card **${card.name}**.`
    };
  })
  .build();
