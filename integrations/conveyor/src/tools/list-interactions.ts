import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let connectionSummarySchema = z
  .object({
    connectionId: z.string().describe('ID of the connection'),
    domain: z.string().describe('Domain of the connection'),
    crmLink: z.string().nullable().optional().describe('CRM link'),
    crmId: z.string().nullable().optional().describe('CRM record ID')
  })
  .optional();

let interactionSchema = z.object({
  interactionId: z.string().describe('Unique ID of the interaction'),
  createdAt: z.string().describe('When the interaction occurred'),
  type: z.string().describe('Type of interaction: "Document" or "Q & A"'),
  email: z.string().describe('Email of the user who performed the interaction'),
  content: z.string().describe('Details of the interaction'),
  connection: connectionSummarySchema.describe('Associated connection')
});

export let listInteractions = SlateTool.create(spec, {
  name: 'List Interactions',
  key: 'list_interactions',
  description: `Retrieve Trust Center interactions (document views, downloads, Q&A activity). Can filter globally or by a specific connection, document, or question. Useful for understanding customer engagement with your security content.`,
  instructions: [
    'Provide at most one of connectionId, documentId, or questionId to filter interactions by that resource.',
    'Date filters use YYYY-MM-DD format.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().optional().describe('Filter interactions by connection ID'),
      documentId: z.string().optional().describe('Filter interactions by document ID'),
      questionId: z
        .string()
        .optional()
        .describe('Filter interactions by knowledge base question ID'),
      type: z.enum(['Document', 'Q & A']).optional().describe('Filter by interaction type'),
      createdAtStart: z
        .string()
        .optional()
        .describe('Interactions created on or after this date (YYYY-MM-DD)'),
      createdAtEnd: z
        .string()
        .optional()
        .describe('Interactions created on or before this date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 100)')
    })
  )
  .output(
    z.object({
      interactions: z.array(interactionSchema).describe('List of interactions'),
      page: z.number().describe('Current page'),
      perPage: z.number().describe('Results per page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data: any;
    let filterDescription = '';

    if (ctx.input.connectionId) {
      data = await client.listInteractionsByConnection(ctx.input.connectionId, {
        type: ctx.input.type,
        createdAtStart: ctx.input.createdAtStart,
        createdAtEnd: ctx.input.createdAtEnd,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      filterDescription = ` for connection \`${ctx.input.connectionId}\``;
    } else if (ctx.input.documentId) {
      data = await client.listInteractionsByDocument(ctx.input.documentId, {
        createdAtStart: ctx.input.createdAtStart,
        createdAtEnd: ctx.input.createdAtEnd,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      filterDescription = ` for document \`${ctx.input.documentId}\``;
    } else if (ctx.input.questionId) {
      data = await client.listInteractionsByQuestion(ctx.input.questionId, {
        createdAtStart: ctx.input.createdAtStart,
        createdAtEnd: ctx.input.createdAtEnd,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      filterDescription = ` for question \`${ctx.input.questionId}\``;
    } else {
      data = await client.listInteractions({
        type: ctx.input.type,
        createdAtStart: ctx.input.createdAtStart,
        createdAtEnd: ctx.input.createdAtEnd,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    }

    let interactions = (data.interactions || []).map((i: any) => ({
      interactionId: i.id,
      createdAt: i.created_at,
      type: i.type,
      email: i.email,
      content: i.content,
      connection: i.connection
        ? {
            connectionId: i.connection.id,
            domain: i.connection.domain,
            crmLink: i.connection.crm_link,
            crmId: i.connection.crm_id
          }
        : undefined
    }));

    return {
      output: {
        interactions,
        page: data.page,
        perPage: data.per_page,
        totalPages: data.total_pages
      },
      message: `Found **${interactions.length}** interactions${filterDescription} (page ${data.page} of ${data.total_pages}).`
    };
  })
  .build();
