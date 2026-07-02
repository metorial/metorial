import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let searchCreditNotes = SlateTool.create(spec, {
  name: 'Search Credit Notes',
  key: 'search_credit_notes',
  description: `Search and list credit notes in sevDesk. Filter by status, contact, or credit note number. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z.string().optional().describe('Filter by status'),
      creditNoteNumber: z.string().optional().describe('Filter by credit note number'),
      contactId: z.string().optional().describe('Filter by contact ID'),
      limit: z.number().optional().describe('Max results (default: 100, max: 1000)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      creditNotes: z.array(
        z.object({
          creditNoteId: z.string(),
          creditNoteNumber: z.string().optional(),
          contactId: z.string().optional(),
          contactName: z.string().optional(),
          status: z.string().optional(),
          totalNet: z.string().optional(),
          totalGross: z.string().optional(),
          creditNoteDate: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let params: Record<string, any> = {
      limit: ctx.input.limit ?? 100,
      offset: ctx.input.offset,
      embed: 'contact'
    };
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.creditNoteNumber) params.creditNoteNumber = ctx.input.creditNoteNumber;
    if (ctx.input.contactId) {
      params['contact[id]'] = ctx.input.contactId;
      params['contact[objectName]'] = 'Contact';
    }

    let results = await client.listCreditNotes(params);

    let creditNotes = (results ?? []).map((cn: any) => ({
      creditNoteId: String(cn.id),
      creditNoteNumber: cn.creditNoteNumber ?? undefined,
      contactId: cn.contact?.id ? String(cn.contact.id) : undefined,
      contactName: cn.contact?.name || undefined,
      status: cn.status != null ? String(cn.status) : undefined,
      totalNet: cn.sumNet ?? undefined,
      totalGross: cn.sumGross ?? undefined,
      creditNoteDate: cn.creditNoteDate ?? undefined,
      createdAt: cn.create ?? undefined
    }));

    return {
      output: {
        creditNotes,
        totalCount: creditNotes.length
      },
      message: `Found **${creditNotes.length}** credit note(s).`
    };
  })
  .build();
