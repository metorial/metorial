import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// ---- Reporting Summary ----

export let getReportSummary = SlateTool.create(spec, {
  name: 'Get Report Summary',
  key: 'get_report_summary',
  description: `Retrieve a status summary of all mailpieces within a date range. Shows totals for each status: received, printing, handed over, local delivery, delivered, returned, and cancelled.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format (inclusive)')
    })
  )
  .output(
    z.object({
      total: z.number().optional().describe('Total mailpieces in range'),
      received: z.number().optional().describe('Count of received mailpieces'),
      printing: z.number().optional().describe('Count of printing mailpieces'),
      handedOver: z.number().optional().describe('Count of mailpieces handed over to carrier'),
      localDelivery: z.number().optional().describe('Count in local delivery'),
      delivered: z.number().optional().describe('Count of delivered mailpieces'),
      returned: z.number().optional().describe('Count of returned mailpieces'),
      cancelled: z.number().optional().describe('Count of cancelled mailpieces')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.getReportingSummary(ctx.input.startDate, ctx.input.endDate);

    return {
      output: {
        total: result.total,
        received: result.received,
        printing: result.printing,
        handedOver: result.handed_over,
        localDelivery: result.local_delivery,
        delivered: result.delivered,
        returned: result.returned,
        cancelled: result.cancelled
      },
      message: `Report for **${ctx.input.startDate}** to **${ctx.input.endDate}**: ${result.total ?? 0} total, ${result.delivered ?? 0} delivered, ${result.returned ?? 0} returned.`
    };
  })
  .build();

// ---- List Mailpieces ----

export let listMailpieces = SlateTool.create(spec, {
  name: 'List Mailpieces',
  key: 'list_mailpieces',
  description: `Retrieve a detailed list of individual mailpiece objects sent within a date range. Optionally filter by status or tag.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().describe('End date in YYYY-MM-DD format (inclusive)'),
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g. delivered, returned, cancelled)'),
      tag: z.string().optional().describe('Filter by tag')
    })
  )
  .output(
    z.object({
      mailpieces: z
        .array(
          z.object({
            mailpieceId: z.string().describe('Mailpiece ID'),
            timestamp: z.string().optional().describe('Creation timestamp'),
            status: z.string().optional().describe('Current status'),
            type: z.string().optional().describe('Mailpiece type'),
            format: z.string().optional().describe('Format/size'),
            pdfUrl: z.string().optional().describe('PDF URL'),
            dispatched: z.string().optional().describe('Dispatch timestamp'),
            country: z.string().optional().describe('Destination country'),
            cost: z.string().optional().describe('Cost'),
            tags: z.string().optional().describe('Associated tags'),
            zipcode: z.string().optional().describe('Destination zip/postal code')
          })
        )
        .describe('List of mailpiece objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.getReportingList(
      ctx.input.startDate,
      ctx.input.endDate,
      ctx.input.status,
      ctx.input.tag
    );

    let mailpieces = Array.isArray(result)
      ? result.map((m: any) => ({
          mailpieceId: String(m.id),
          timestamp: m.timestamp,
          status: m.status,
          type: m.type,
          format: m.format,
          pdfUrl: m.pdf_file,
          dispatched: m.dispatched,
          country: m.country,
          cost: m.cost,
          tags: m.tags,
          zipcode: m.zipcode
        }))
      : [];

    return {
      output: { mailpieces },
      message: `Found **${mailpieces.length}** mailpieces from **${ctx.input.startDate}** to **${ctx.input.endDate}**.`
    };
  })
  .build();
