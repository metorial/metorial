import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, inputId, record, requiredText } from '../lib/client';
import { cardOutput, mapCard, pageInput, pageOutput } from '../lib/schemas';
import { spec } from '../spec';

export let listCards = SlateTool.create(spec, {
  name: 'List Postcards',
  key: 'list_cards',
  description:
    'List postcards with optional status, printing date, and motive filters. Use the returned IDs to inspect or cancel a postcard.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...pageInput,
      statuses: z
        .array(z.enum(['pending', 'scheduled', 'sent', 'canceled']))
        .optional()
        .describe('Match any of these postcard statuses'),
      deliverAt: z
        .string()
        .optional()
        .describe('Filter by printing date in YYYY-MM-DD format'),
      motiveId: z.string().optional().describe('Filter by motive ID'),
      sort: z.enum(['created_at', 'deliver_at']).optional().describe('Sort field'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(z.object({ cards: z.array(cardOutput), ...pageOutput }))
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).list('/cards', {
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      status: ctx.input.statuses?.join(','),
      deliver_at: ctx.input.deliverAt,
      motive_id:
        ctx.input.motiveId === undefined ? undefined : inputId(ctx.input.motiveId, 'motiveId'),
      sort: ctx.input.sort,
      direction: ctx.input.direction
    });
    return {
      output: {
        cards: result.items.map(mapCard),
        totalCount: result.totalCount,
        totalPages: result.totalPages,
        links: result.links
      },
      message: `Found ${result.items.length} postcard(s) on this page.`
    };
  })
  .build();

export let getCard = SlateTool.create(spec, {
  name: 'Get Postcard',
  key: 'get_card',
  description: 'Read a postcard and its delivery status and cancelable flag.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      cardId: z.string().describe('Postcard UUID from Send Postcard or List Postcards')
    })
  )
  .output(cardOutput)
  .handleInvocation(async ctx => {
    let id = encodeURIComponent(requiredText(ctx.input.cardId, 'cardId'));
    let result = await new Client({ token: ctx.auth.token }).get(`/cards/${id}`);
    return { output: mapCard(result), message: 'Retrieved postcard.' };
  })
  .build();

export let cancelCard = SlateTool.create(spec, {
  name: 'Cancel Postcard',
  key: 'cancel_card',
  description:
    'Queue cancellation of a postcard that is still cancelable. Acceptance is asynchronous; use Get Postcard to check its resulting status.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ cardId: z.string().describe('Postcard UUID to cancel') }))
  .output(cardOutput)
  .handleInvocation(async ctx => {
    let id = encodeURIComponent(requiredText(ctx.input.cardId, 'cardId'));
    let result = await new Client({ token: ctx.auth.token }).request('DELETE', `/cards/${id}`);
    if (result.status !== 202)
      throw createApiServiceError('EchtPost did not confirm that cancellation was queued.');
    return {
      output: mapCard(record(result.data)),
      message: 'Postcard cancellation queued; check its status to confirm completion.'
    };
  })
  .build();
