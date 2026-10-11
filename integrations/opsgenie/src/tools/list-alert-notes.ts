import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { getNextPageOffset } from '../lib/paging';
import { spec } from '../spec';

export let listAlertNotes = SlateTool.create(spec, {
  name: 'List Alert Notes',
  key: 'list_alert_notes',
  description: `List the notes added to an alert, such as responder updates and investigation findings. Supports cursor pagination.`,
  instructions: ['When nextOffset is returned, pass it as offset to fetch the next page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      alertIdentifier: z.string().describe('Alert ID, tiny ID, or alias'),
      identifierType: z
        .enum(['id', 'tiny', 'alias'])
        .optional()
        .describe('Type of identifier provided. Defaults to "id"'),
      limit: z.number().optional().describe('Number of notes to return (max 100, default 20)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order. Defaults to "desc"'),
      offset: z
        .string()
        .optional()
        .describe('Pagination cursor (nextOffset from a previous call)'),
      direction: z
        .enum(['next', 'prev'])
        .optional()
        .describe('Page direction relative to offset. Defaults to "next"')
    })
  )
  .output(
    z.object({
      notes: z.array(
        z.object({
          note: z.string().describe('Note text'),
          owner: z.string().optional().describe('Who added the note'),
          createdAt: z.string().optional().describe('When the note was added'),
          offset: z.string().optional().describe('Pagination offset of this note')
        })
      ),
      nextOffset: z
        .string()
        .optional()
        .describe('Cursor to pass as offset to fetch the next page, when available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let response = await client.listAlertNotes(
      ctx.input.alertIdentifier,
      ctx.input.identifierType ?? 'id',
      {
        limit: ctx.input.limit,
        order: ctx.input.order,
        offset: ctx.input.offset,
        direction: ctx.input.direction
      }
    );

    let notes = (response.data ?? []).map((n: any) => ({
      note: n.note ?? '',
      owner: n.owner,
      createdAt: n.createdAt,
      offset: n.offset
    }));

    return {
      output: {
        notes,
        nextOffset: notes.length > 0 ? getNextPageOffset(response.paging) : undefined
      },
      message: `Found **${notes.length}** notes on alert \`${ctx.input.alertIdentifier}\`.`
    };
  })
  .build();
