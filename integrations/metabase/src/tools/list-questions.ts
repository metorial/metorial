import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let listQuestions = SlateTool.create(spec, {
  name: 'List Questions',
  key: 'list_questions',
  description: `List saved questions (cards) in Metabase with optional filtering.
Returns all questions, your questions, bookmarked or archived questions, or questions filtered by a related object.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .enum([
          'all',
          'mine',
          'bookmarked',
          'archived',
          'database',
          'table',
          'using_model',
          'using_segment',
          'fav',
          'recent',
          'popular'
        ])
        .optional()
        .describe('Filter to apply; fav is a backward-compatible alias for bookmarked'),
      modelId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Related database, table, model, or segment ID; required by those filters')
    })
  )
  .output(
    z.object({
      questions: z.array(
        z.object({
          cardId: z.number().describe('ID of the question/card'),
          name: z.string().describe('Name of the question'),
          description: z.string().nullable().describe('Description of the question'),
          display: z.string().describe('Display type'),
          archived: z.boolean().describe('Whether the question is archived'),
          collectionId: z.number().nullable().describe('Collection ID'),
          databaseId: z.number().nullable().describe('Database ID used by the question')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.filter === 'recent' || ctx.input.filter === 'popular') {
      throw createApiServiceError(
        `Current Metabase versions do not support the ${ctx.input.filter} filter on the question-list endpoint. Use search instead.`,
        { reason: 'metabase_card_filter_unsupported' }
      );
    }
    if (
      ['database', 'table', 'using_model', 'using_segment'].includes(ctx.input.filter ?? '') &&
      ctx.input.modelId === undefined
    ) {
      throw createApiServiceError(`The ${ctx.input.filter} filter requires modelId.`, {
        reason: 'metabase_card_filter_model_missing'
      });
    }
    let client = new MetabaseClient(ctx.auth);

    let cards = await client.listCards({
      filter: ctx.input.filter,
      modelId: ctx.input.modelId
    });
    let items = Array.isArray(cards) ? cards : [];

    let questions = items.map((card: any) => ({
      cardId: card.id,
      name: card.name,
      description: card.description ?? null,
      display: card.display,
      archived: card.archived ?? false,
      collectionId: card.collection_id ?? null,
      databaseId: card.database_id ?? null
    }));

    return {
      output: { questions },
      message: `Found **${questions.length}** question(s)${ctx.input.filter ? ` (filter: ${ctx.input.filter})` : ''}`
    };
  })
  .build();
