import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let connectors = [
  'Conversion',
  'PDF',
  'Word',
  'Excel',
  'Image',
  'Barcodes',
  'General',
  'Utilities'
] as const;

let withoutFileContent = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutFileContent);
  if (!isApiErrorRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key.toLowerCase() !== 'filecontent')
      .map(([key, item]) => [key, withoutFileContent(item)])
  );
};

export let getOperationStatus = SlateTool.create(spec, {
  name: 'Get Operation Status',
  key: 'get_operation_status',
  description:
    'Check a queued Encodian operation and retrieve its completed result, including downloadable files. Pass the statusUrl returned by the original tool when available.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      statusUrl: z
        .string()
        .optional()
        .describe(
          'Status URL returned by the original queued operation. Preferred over constructing a lookup from its ID.'
        ),
      operationId: z
        .string()
        .optional()
        .describe('Encodian operation ID, required when statusUrl is omitted.'),
      connector: z
        .enum(connectors)
        .optional()
        .describe(
          'Connector that processed the operation. Required when statusUrl is omitted.'
        ),
      resultType: z
        .enum([
          'file',
          'file_only',
          'multiple_files',
          'string',
          'split_document',
          'archive_extract'
        ])
        .optional()
        .describe(
          'Result shape for an ID lookup. Defaults to file. Use the original statusUrl for other response shapes.'
        )
    })
  )
  .output(
    z.object({
      operationId: z.string(),
      operationStatus: z.string(),
      statusUrl: z.string().optional(),
      fileName: z.string().optional(),
      files: z.array(z.object({ fileName: z.string() })).optional(),
      text: z
        .string()
        .optional()
        .describe('A completed string result, extracted text, translation, or AI response'),
      result: z
        .unknown()
        .optional()
        .describe(
          'Provider operation response with file bytes omitted. Retains specialized fields such as pages, form data, metadata, and utility result values.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let path: string;
    let query: Record<string, string> | undefined;
    if (ctx.input.statusUrl) {
      let url: URL;
      try {
        url = new URL(ctx.input.statusUrl, 'https://api.apps-encodian.com');
      } catch {
        throw createApiServiceError('statusUrl must be an Encodian operation status URL.');
      }
      if (
        url.origin !== 'https://api.apps-encodian.com' ||
        url.username ||
        url.password ||
        !/^\/api\/v1\/(Conversion|PDF|Word|Excel|Image|Barcodes|General|Utilities)\/GetOperationStatus[A-Za-z]*$/.test(
          url.pathname
        )
      ) {
        throw createApiServiceError(
          'statusUrl must point to an Encodian operation status endpoint.'
        );
      }
      path = `${url.pathname.slice('/api/v1'.length)}${url.search}`;
    } else {
      if (!ctx.input.operationId?.trim() || !ctx.input.connector) {
        throw createApiServiceError('Provide statusUrl, or both operationId and connector.');
      }
      let type = ctx.input.resultType ?? 'file';
      let connector = ctx.input.connector;
      if (
        (type === 'string' && !['PDF', 'General'].includes(connector)) ||
        (type === 'split_document' && !['PDF', 'Word', 'Excel'].includes(connector)) ||
        (type === 'archive_extract' && connector !== 'General')
      ) {
        throw createApiServiceError(
          'This resultType is unavailable for the selected connector. Pass the original statusUrl instead.'
        );
      }
      let endpoints = {
        file: 'GetOperationStatus',
        file_only: 'GetOperationStatusFileOnly',
        multiple_files: 'GetOperationStatusMultipleFiles',
        string: 'GetOperationStatusString',
        split_document: 'GetOperationStatusSplitDocument',
        archive_extract: 'GetOperationStatusExtractFromArchiveV2'
      };
      path = `/${connector}/${endpoints[type]}`;
      query = { operationId: ctx.input.operationId };
    }
    let client = new Client(ctx.auth.token, input => ctx.addAttachment(input));
    let result = await client.get<Record<string, unknown>>(path, query);
    let documents = Array.isArray(result.documents)
      ? result.documents
      : Array.isArray(result.Images)
        ? result.Images
        : undefined;
    return {
      output: {
        operationId:
          typeof result.OperationId === 'string'
            ? result.OperationId
            : (ctx.input.operationId ?? ''),
        operationStatus: client.operationStatus,
        statusUrl: client.statusUrl ?? ctx.input.statusUrl,
        fileName: typeof result.Filename === 'string' ? result.Filename : undefined,
        files: documents?.map(file => ({
          fileName: typeof file?.fileName === 'string' ? file.fileName : ''
        })),
        text: [
          result.result,
          result.TextLayer,
          result.text,
          result.Text,
          result.translation,
          result.message
        ].find((value): value is string => typeof value === 'string'),
        result: withoutFileContent(result)
      },
      message: client.message('Retrieved the completed Encodian operation result.')
    };
  })
  .build();
