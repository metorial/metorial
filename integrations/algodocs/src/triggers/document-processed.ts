import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentProcessed = SlateTrigger.create(spec, {
  name: 'Document Processed',
  key: 'document_processed',
  description:
    'Triggers when a document has been processed and extracted data is available. Polls for new extracted data records from a specified extractor.'
})
  .input(
    z.object({
      recordId: z.string().describe('Unique identifier of the extracted record'),
      documentId: z.string().describe('ID of the source document'),
      extractorId: z.string().describe('ID of the extractor used'),
      folderId: z.string().describe('ID of the folder containing the document'),
      uploadedAt: z.string().describe('Timestamp when the document was uploaded'),
      fileName: z.string().describe('Name of the source file'),
      pageNumber: z.number().describe('Page number the data was extracted from'),
      extractedFields: z
        .record(z.string(), z.unknown())
        .describe('User-defined extracted fields and their values')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('Unique identifier of the extracted record'),
      documentId: z.string().describe('ID of the source document'),
      extractorId: z.string().describe('ID of the extractor used'),
      folderId: z.string().describe('ID of the folder containing the document'),
      uploadedAt: z.string().describe('Timestamp when the document was uploaded'),
      fileName: z.string().describe('Name of the source file'),
      pageNumber: z.number().describe('Page number the data was extracted from'),
      extractedFields: z
        .record(z.string(), z.unknown())
        .describe('User-defined extracted fields and their values')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        email: ctx.auth.email
      });

      let extractors = await client.getExtractors();

      let seenIds: Record<string, boolean> =
        (ctx.state?.seenIds as Record<string, boolean>) || {};
      let isFirstRun = !ctx.state?.initialized;

      let systemFields = [
        'id',
        'documentId',
        'extractorId',
        'folderId',
        'uploadedAt',
        'fileName',
        'pageNumber'
      ];

      let inputs: Array<{
        recordId: string;
        documentId: string;
        extractorId: string;
        folderId: string;
        uploadedAt: string;
        fileName: string;
        pageNumber: number;
        extractedFields: Record<string, unknown>;
      }> = [];

      for (let extractor of extractors) {
        let records = await client.getExtractedDataByExtractor(extractor.id, {
          date: '1',
          limit: 100
        });

        for (let record of records) {
          let recordId = String(record.id);

          if (seenIds[recordId]) {
            continue;
          }

          seenIds[recordId] = true;

          if (isFirstRun) {
            continue;
          }

          let extractedFields: Record<string, unknown> = {};
          for (let key of Object.keys(record)) {
            if (!systemFields.includes(key)) {
              extractedFields[key] = record[key];
            }
          }

          inputs.push({
            recordId,
            documentId: String(record.documentId),
            extractorId: String(record.extractorId),
            folderId: String(record.folderId),
            uploadedAt: String(record.uploadedAt),
            fileName: String(record.fileName),
            pageNumber: Number(record.pageNumber),
            extractedFields
          });
        }
      }

      return {
        inputs,
        updatedState: {
          seenIds,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'document.processed',
        id: ctx.input.recordId,
        output: {
          recordId: ctx.input.recordId,
          documentId: ctx.input.documentId,
          extractorId: ctx.input.extractorId,
          folderId: ctx.input.folderId,
          uploadedAt: ctx.input.uploadedAt,
          fileName: ctx.input.fileName,
          pageNumber: ctx.input.pageNumber,
          extractedFields: ctx.input.extractedFields
        }
      };
    }
  })
  .build();
