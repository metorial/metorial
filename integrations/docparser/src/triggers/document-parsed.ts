import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let documentParsed = SlateTrigger.create(spec, {
  name: 'Document Parsed',
  key: 'document_parsed',
  description:
    'Triggers when a document has been fully processed and parsed data is available. Polls across all or a specific parser for newly parsed documents.'
})
  .input(
    z.object({
      parserId: z.string().describe('ID of the parser that processed the document'),
      documentId: z.string().describe('ID of the parsed document'),
      parsedData: z.any().describe('Parsed data extracted from the document')
    })
  )
  .output(
    z.object({
      parserId: z.string().describe('ID of the parser that processed the document'),
      documentId: z.string().describe('ID of the parsed document'),
      parsedFields: z.any().describe('Extracted fields and their values')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let parsers = await client.listParsers();
      let inputs: Array<{
        parserId: string;
        documentId: string;
        parsedData: any;
      }> = [];

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      for (let parser of parsers) {
        let results = await client.getParsedDataByParser(parser.parserId, {
          list: lastPollTime ? 'processed_after' : 'last_uploaded',
          limit: lastPollTime ? undefined : 10
        });

        for (let result of results) {
          let docId = result.id || result.document_id || '';
          if (docId) {
            inputs.push({
              parserId: parser.parserId,
              documentId: docId,
              parsedData: result
            });
          }
        }
      }

      let now = new Date().toISOString();

      return {
        inputs,
        updatedState: {
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'document.parsed',
        id: `${ctx.input.parserId}-${ctx.input.documentId}`,
        output: {
          parserId: ctx.input.parserId,
          documentId: ctx.input.documentId,
          parsedFields: ctx.input.parsedData
        }
      };
    }
  })
  .build();
