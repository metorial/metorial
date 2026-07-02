import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCustomerNotes = SlateTool.create(spec, {
  name: 'Manage Customer Notes',
  key: 'manage_customer_notes',
  description: `List, create, or delete notes on customer records. Notes are used for internal annotations on customers. Use the **action** field to specify what operation to perform.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('The operation to perform'),
      filter: z
        .object({
          customerIds: z
            .array(z.number())
            .optional()
            .describe('Filter notes by customer internal IDs'),
          customerExternalIds: z
            .array(z.string())
            .optional()
            .describe('Filter notes by customer external IDs'),
          managerIds: z.array(z.number()).optional().describe('Filter notes by manager IDs'),
          text: z.string().optional().describe('Filter by note text (partial match)'),
          createdAtFrom: z
            .string()
            .optional()
            .describe('Created from date (YYYY-MM-DD HH:MM:SS)'),
          createdAtTo: z.string().optional().describe('Created to date (YYYY-MM-DD HH:MM:SS)')
        })
        .optional()
        .describe('Filters for the list action'),
      page: z.number().optional().describe('Page number (for list action)'),
      limit: z.number().optional().describe('Results per page (for list action)'),
      customerId: z.number().optional().describe('Customer internal ID (for create action)'),
      customerExternalId: z
        .string()
        .optional()
        .describe('Customer external ID (for create action)'),
      text: z.string().optional().describe('Note text (for create action)'),
      managerId: z
        .number()
        .optional()
        .describe('Manager ID who creates the note (for create action)'),
      noteId: z.number().optional().describe('Note ID to delete (for delete action)')
    })
  )
  .output(
    z.object({
      notes: z
        .array(
          z.object({
            noteId: z.number().optional(),
            text: z.string().optional(),
            managerId: z.number().optional(),
            createdAt: z.string().optional(),
            customerId: z.number().optional(),
            customerExternalId: z.string().optional()
          })
        )
        .optional()
        .describe('List of notes (for list action)'),
      createdNoteId: z.number().optional().describe('Created note ID (for create action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the note was deleted (for delete action)'),
      totalCount: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    if (ctx.input.action === 'list') {
      let filter: Record<string, any> = {};
      if (ctx.input.filter?.customerIds) filter.customerIds = ctx.input.filter.customerIds;
      if (ctx.input.filter?.customerExternalIds)
        filter.customerExternalIds = ctx.input.filter.customerExternalIds;
      if (ctx.input.filter?.managerIds) filter.managerIds = ctx.input.filter.managerIds;
      if (ctx.input.filter?.text) filter.text = ctx.input.filter.text;
      if (ctx.input.filter?.createdAtFrom)
        filter.createdAtFrom = ctx.input.filter.createdAtFrom;
      if (ctx.input.filter?.createdAtTo) filter.createdAtTo = ctx.input.filter.createdAtTo;

      let result = await client.getCustomerNotes(
        Object.keys(filter).length > 0 ? filter : undefined,
        ctx.input.page,
        ctx.input.limit
      );

      let notes = result.notes.map(n => ({
        noteId: n.id,
        text: n.text,
        managerId: n.managerId,
        createdAt: n.createdAt,
        customerId: n.customer?.id,
        customerExternalId: n.customer?.externalId
      }));

      return {
        output: {
          notes,
          totalCount: result.pagination.totalCount,
          currentPage: result.pagination.currentPage,
          totalPages: result.pagination.totalPageCount
        },
        message: `Found **${result.pagination.totalCount}** notes. Returned ${notes.length} results.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.text) {
        throw new Error('Note text is required for create action.');
      }
      if (!ctx.input.customerId && !ctx.input.customerExternalId) {
        throw new Error(
          'Either customerId or customerExternalId is required for create action.'
        );
      }

      let noteData: any = {
        customer: {
          id: ctx.input.customerId,
          externalId: ctx.input.customerExternalId
        },
        text: ctx.input.text,
        managerId: ctx.input.managerId
      };

      let result = await client.createCustomerNote(noteData);

      return {
        output: {
          createdNoteId: result.noteId
        },
        message: `Created note **${result.noteId}** on customer.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.noteId) {
        throw new Error('noteId is required for delete action.');
      }
      await client.deleteCustomerNote(ctx.input.noteId);

      return {
        output: {
          deleted: true
        },
        message: `Deleted note **${ctx.input.noteId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
