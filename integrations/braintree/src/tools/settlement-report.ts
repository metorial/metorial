import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeRestClient } from '../lib/client';
import { buildXml, parseXml } from '../lib/xml';
import { spec } from '../spec';

export let getSettlementReport = SlateTool.create(spec, {
  name: 'Settlement Batch Summary',
  key: 'settlement_report',
  description: `Generates a settlement batch summary report for a given date. Returns aggregated totals for transactions settled on the specified date, optionally grouped by a custom field.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      settlementDate: z.string().describe('Date for the settlement report (YYYY-MM-DD)'),
      groupByCustomField: z
        .string()
        .optional()
        .describe('Optional custom field name to group results by')
    })
  )
  .output(
    z.object({
      records: z
        .array(
          z.object({
            cardType: z.string().optional().nullable().describe('Card type'),
            kind: z.string().optional().nullable().describe('Transaction kind'),
            merchantAccountId: z
              .string()
              .optional()
              .nullable()
              .describe('Merchant account ID'),
            count: z.string().optional().nullable().describe('Number of transactions'),
            amountSettled: z.string().optional().nullable().describe('Total amount settled'),
            customFieldValue: z
              .string()
              .optional()
              .nullable()
              .describe('Custom field value (if grouped)')
          })
        )
        .describe('Settlement batch summary records'),
      settlementDate: z.string().describe('The settlement date queried')
    })
  )
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let data: Record<string, any> = {
      settlementDate: ctx.input.settlementDate
    };
    if (ctx.input.groupByCustomField) {
      data.groupByCustomField = ctx.input.groupByCustomField;
    }

    let body = buildXml('settlement-batch-summary', data);
    let xml = await rest.post('/settlement_batch_summary', body);
    let parsed = parseXml(xml);

    let summary = parsed.settlementBatchSummary || parsed;
    let records: any[] = [];

    if (summary.records && Array.isArray(summary.records)) {
      records = summary.records.map((r: any) => ({
        cardType: r.cardType || null,
        kind: r.kind || null,
        merchantAccountId: r.merchantAccountId || null,
        count: r.count || null,
        amountSettled: r.amountSettled || null,
        customFieldValue: r.customFieldValue || null
      }));
    }

    return {
      output: {
        records,
        settlementDate: ctx.input.settlementDate
      },
      message: `Settlement summary for **${ctx.input.settlementDate}** — **${records.length}** record(s)`
    };
  })
  .build();
