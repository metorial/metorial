import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBankStatementAnalytics = SlateTool.create(spec, {
  name: 'Get Bank Statement Analytics',
  key: 'get_bank_statement_analytics',
  description: `Retrieve Docsumo bank statement analytics for a processed bank statement document. Use "basic" for summary metrics or "all" for the full analytics report.`,
  instructions: [
    'The document must be a processed bank statement document.',
    'This tool requests JSON analytics only; downloadable CSV/XLSX formats are not exposed inline.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('Bank statement document ID'),
      mode: z
        .enum(['basic', 'all'])
        .optional()
        .describe('Analytics detail level. Defaults to "basic".')
    })
  )
  .output(
    z.object({
      docId: z.string().describe('Document ID'),
      mode: z.string().describe('Analytics detail level requested'),
      analytics: z.record(z.string(), z.any()).describe('Docsumo analytics payload')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let mode = ctx.input.mode || 'basic';
    let analytics = await client.getBankStatementAnalytics(ctx.input.docId, mode);

    return {
      output: {
        docId: ctx.input.docId,
        mode,
        analytics
      },
      message: `Retrieved ${mode} bank statement analytics for document **${ctx.input.docId}**.`
    };
  })
  .build();
