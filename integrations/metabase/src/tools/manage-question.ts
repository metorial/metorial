import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let manageQuestion = SlateTool.create(spec, {
  name: 'Manage Question',
  key: 'manage_question',
  description: `Create, update, retrieve, or archive a saved question (card) in Metabase.
Questions can be built using native SQL or Metabase's structured query language (MBQL).
Use this to manage saved questions including changing their name, description, display type, collection, or query definition.
Set **archived** to true to move a question to the trash.`,
  instructions: [
    'To create a question, provide a name and datasetQuery. The datasetQuery should include the database ID, query type, and either a native SQL query or MBQL query object.',
    'For native SQL: set datasetQuery to { "database": 1, "type": "native", "native": { "query": "SELECT * FROM table" } }',
    'For MBQL: set datasetQuery to { "database": 1, "type": "query", "query": { "source-table": 2 } }'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get']).describe('The action to perform'),
      cardId: z
        .number()
        .optional()
        .describe('ID of the question/card (required for get and update)'),
      name: z.string().optional().describe('Name of the question (required for create)'),
      description: z.string().optional().describe('Description of the question'),
      display: z
        .string()
        .optional()
        .describe(
          'Display type (e.g., table, bar, line, pie, scalar, row, area, combo, pivot, scatter, waterfall, funnel, map)'
        ),
      datasetQuery: z
        .any()
        .optional()
        .describe(
          'The query definition object containing database, type, and query/native fields'
        ),
      collectionId: z
        .number()
        .nullable()
        .optional()
        .describe('ID of the collection to place the question in, or null for root'),
      visualizationSettings: z.any().optional().describe('Visualization settings object'),
      archived: z.boolean().optional().describe('Set to true to archive (trash) the question')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('ID of the question/card'),
      name: z.string().describe('Name of the question'),
      description: z.string().nullable().describe('Description of the question'),
      display: z.string().describe('Display type'),
      archived: z.boolean().describe('Whether the question is archived'),
      collectionId: z.number().nullable().describe('Collection ID the question belongs to'),
      creatorId: z.number().optional().describe('ID of the user who created the question'),
      createdAt: z.string().optional().describe('When the question was created'),
      updatedAt: z.string().optional().describe('When the question was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let card: any;

    if (ctx.input.action === 'create') {
      card = await client.createCard({
        name: ctx.input.name!,
        datasetQuery: ctx.input.datasetQuery,
        display: ctx.input.display,
        description: ctx.input.description,
        collectionId: ctx.input.collectionId,
        visualizationSettings: ctx.input.visualizationSettings
      });
    } else if (ctx.input.action === 'update') {
      card = await client.updateCard(ctx.input.cardId!, {
        name: ctx.input.name,
        description: ctx.input.description,
        display: ctx.input.display,
        datasetQuery: ctx.input.datasetQuery,
        collectionId: ctx.input.collectionId,
        archived: ctx.input.archived,
        visualizationSettings: ctx.input.visualizationSettings
      });
    } else {
      card = await client.getCard(ctx.input.cardId!);
    }

    return {
      output: {
        cardId: card.id,
        name: card.name,
        description: card.description ?? null,
        display: card.display,
        archived: card.archived ?? false,
        collectionId: card.collection_id ?? null,
        creatorId: card.creator_id,
        createdAt: card.created_at,
        updatedAt: card.updated_at
      },
      message:
        ctx.input.action === 'create'
          ? `Created question **${card.name}** (ID: ${card.id})`
          : ctx.input.action === 'update'
            ? `Updated question **${card.name}** (ID: ${card.id})`
            : `Retrieved question **${card.name}** (ID: ${card.id})`
    };
  })
  .build();
