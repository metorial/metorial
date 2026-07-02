import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pdfGenerationCompleted = SlateTrigger.create(spec, {
  name: 'PDF Generation Completed',
  key: 'pdf_generation_completed',
  description:
    'Triggers when new PDF generation transactions are recorded. Polls the CraftMyPDF transaction history for new entries since the last check.'
})
  .input(
    z.object({
      transactionRef: z.string().describe('Unique transaction reference.'),
      templateId: z.string().describe('ID of the template used.'),
      credits: z.number().describe('Credits consumed.'),
      createdAt: z.string().describe('Transaction creation timestamp.'),
      operation: z.string().describe('Type of operation performed.'),
      fileUrl: z.string().describe('URL of the generated file.')
    })
  )
  .output(
    z.object({
      transactionRef: z.string().describe('Unique transaction reference for this generation.'),
      templateId: z.string().describe('ID of the template used to generate the PDF.'),
      credits: z.number().describe('Number of credits consumed by this generation.'),
      createdAt: z.string().describe('Timestamp when the PDF was generated.'),
      operation: z.string().describe('Type of generation operation.'),
      fileUrl: z.string().describe('URL to download the generated PDF.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let lastSeenRef = (ctx.state as { lastSeenRef?: string } | null)?.lastSeenRef || null;

      let result = await client.listTransactions({ limit: 50 });
      let transactions = result.transactions || [];

      let newTransactions: typeof transactions = [];
      for (let t of transactions) {
        if (t.transaction_ref === lastSeenRef) break;
        newTransactions.push(t);
      }

      let firstTransaction = transactions[0];
      let updatedLastSeenRef = firstTransaction
        ? firstTransaction.transaction_ref
        : lastSeenRef;

      return {
        inputs: newTransactions.map(t => ({
          transactionRef: t.transaction_ref,
          templateId: t.template_id || '',
          credits: t.credits,
          createdAt: t.created_at,
          operation: t.operation || '',
          fileUrl: t.file || ''
        })),
        updatedState: {
          lastSeenRef: updatedLastSeenRef
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'pdf_generation.completed',
        id: ctx.input.transactionRef,
        output: {
          transactionRef: ctx.input.transactionRef,
          templateId: ctx.input.templateId,
          credits: ctx.input.credits,
          createdAt: ctx.input.createdAt,
          operation: ctx.input.operation,
          fileUrl: ctx.input.fileUrl
        }
      };
    }
  })
  .build();
