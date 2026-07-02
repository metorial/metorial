import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let listQuestions = SlateTool.create(spec, {
  name: 'List Questions',
  key: 'list_questions',
  description: `List saved questions (cards) in Metabase with optional filtering.
Returns all questions, your questions, favorites, archived questions, or questions filtered by database/table.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .enum(['all', 'mine', 'fav', 'archived', 'database', 'table', 'recent', 'popular'])
        .optional()
        .describe('Filter to apply when listing questions')
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
    let client = new MetabaseClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let cards = await client.listCards({ filter: ctx.input.filter });
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
