import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let listCreditNotes = SlateTool.create(spec, {
  name: 'List Credit Notes',
  key: 'list_credit_notes',
  description: `Retrieve credit notes from FreeAgent with optional filtering by status, contact, or project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      view: z
        .enum(['all', 'open', 'draft', 'overdue', 'refunded'])
        .optional()
        .describe('Filter credit notes by status'),
      sort: z
        .enum(['created_at', '-created_at', 'updated_at', '-updated_at'])
        .optional()
        .describe('Sort order'),
      updatedSince: z.string().optional().describe('ISO 8601 timestamp'),
      contactId: z.string().optional().describe('Filter by contact ID'),
      projectId: z.string().optional().describe('Filter by project ID'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      creditNotes: z
        .array(z.record(z.string(), z.any()))
        .describe('List of credit note records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let creditNotes = await client.listCreditNotes(ctx.input);
    let count = creditNotes.length;

    return {
      output: { creditNotes },
      message: `Found **${count}** credit note${count !== 1 ? 's' : ''}.`
    };
  })
  .build();
