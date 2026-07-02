import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDocument = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_document',
  description: `Ingest a new document into Ragie for indexing and retrieval. Supports creating documents from a **publicly accessible URL** or from **raw text/JSON data**.
Use this to add content to your Ragie knowledge base. Documents go through processing states and become retrievable once indexed.`,
  instructions: [
    'Provide either a URL or raw data, not both. If both are provided, URL takes precedence.',
    'Use mode "hi_res" to extract images and tables from PDFs. Use "fast" for text-only extraction (up to 20x faster).'
  ],
  constraints: [
    'URL must be publicly accessible and between 1-2083 characters.',
    'PDF limit: 2000 pages in hi_res mode.',
    'Metadata may have up to 1000 total values. Keys starting with underscore are reserved.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      source: z
        .enum(['url', 'raw'])
        .describe('Source type: "url" for publicly accessible URL, "raw" for text/JSON data'),
      url: z
        .string()
        .optional()
        .describe('Publicly accessible URL to ingest (required when source is "url")'),
      rawData: z
        .union([z.string(), z.record(z.string(), z.any())])
        .optional()
        .describe('Text or JSON data to ingest (required when source is "raw")'),
      name: z
        .string()
        .optional()
        .describe('Custom name for the document. Defaults to filename or timestamp.'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Key-value metadata to attach. Supports string, number, boolean, and string array values.'
        ),
      mode: z
        .enum(['fast', 'hi_res'])
        .optional()
        .describe(
          'Import mode. "fast" extracts text only (default), "hi_res" extracts images and tables.'
        ),
      externalId: z
        .string()
        .optional()
        .describe('External reference identifier for the document'),
      partition: z
        .string()
        .optional()
        .describe(
          'Partition to scope the document to. Overrides default partition from config.'
        )
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique ID of the created document'),
      name: z.string().describe('Name of the document'),
      status: z.string().describe('Processing status of the document'),
      partition: z.string().nullable().describe('Partition the document belongs to'),
      externalId: z.string().nullable().describe('External reference identifier'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      partition: ctx.config.partition
    });

    let doc: any;
    if (ctx.input.source === 'url') {
      if (!ctx.input.url) {
        throw new Error('URL is required when source is "url"');
      }
      doc = await client.createDocumentFromUrl({
        url: ctx.input.url,
        name: ctx.input.name,
        metadata: ctx.input.metadata,
        mode: ctx.input.mode,
        externalId: ctx.input.externalId,
        partition: ctx.input.partition
      });
    } else {
      if (!ctx.input.rawData) {
        throw new Error('rawData is required when source is "raw"');
      }
      doc = await client.createDocumentRaw({
        data: ctx.input.rawData,
        name: ctx.input.name,
        metadata: ctx.input.metadata,
        externalId: ctx.input.externalId,
        partition: ctx.input.partition
      });
    }

    return {
      output: {
        documentId: doc.id,
        name: doc.name,
        status: doc.status,
        partition: doc.partition,
        externalId: doc.externalId,
        createdAt: doc.createdAt
      },
      message: `Document **${doc.name}** created successfully with status \`${doc.status}\`. Document ID: \`${doc.id}\``
    };
  })
  .build();
