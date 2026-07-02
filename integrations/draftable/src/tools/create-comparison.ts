import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let documentSideSchema = z.object({
  sourceUrl: z.string().describe('Publicly accessible URL to fetch the document from'),
  fileType: z
    .enum([
      'pdf',
      'docx',
      'docm',
      'doc',
      'rtf',
      'pptx',
      'pptm',
      'ppt',
      'xlsx',
      'xlsm',
      'xls',
      'csv',
      'odt',
      'txt'
    ])
    .describe('File type of the document'),
  displayName: z.string().optional().describe('Display name shown in the comparison viewer')
});

export let createComparison = SlateTool.create(spec, {
  name: 'Create Comparison',
  key: 'create_comparison',
  description: `Creates a new document comparison between two documents (left and right). Documents are provided via publicly accessible URLs. Supports cross-format comparisons (e.g., Word to PDF). The comparison will be processed asynchronously — check the \`ready\` field to determine when results are available.`,
  instructions: [
    'Both left and right documents must have a sourceUrl pointing to a publicly accessible URL.',
    'Set isPublic to true if the comparison should be viewable without authentication.'
  ],
  constraints: [
    'Supported file types: pdf, docx, docm, doc, rtf, pptx, pptm, ppt, xlsx, xlsm, xls, csv, odt, txt.',
    'If expiryTime is provided, it must be a UTC ISO 8601 timestamp in the future.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      left: documentSideSchema.describe('The original (left-side) document'),
      right: documentSideSchema.describe('The revised (right-side) document'),
      comparisonIdentifier: z
        .string()
        .optional()
        .describe(
          'Custom unique identifier for the comparison. If not provided, one will be generated automatically.'
        ),
      isPublic: z
        .boolean()
        .optional()
        .describe(
          'If true, the comparison can be viewed by anyone with the URL. Defaults to false.'
        ),
      expiryTime: z
        .string()
        .optional()
        .describe(
          'UTC ISO 8601 timestamp when the comparison should expire and be deleted. If not set, the comparison will not expire.'
        )
    })
  )
  .output(
    z.object({
      comparisonIdentifier: z.string().describe('Unique identifier for the comparison'),
      left: z.object({
        fileType: z.string().describe('File type of the left document'),
        sourceUrl: z.string().nullable().describe('Source URL of the left document'),
        displayName: z.string().nullable().describe('Display name of the left document')
      }),
      right: z.object({
        fileType: z.string().describe('File type of the right document'),
        sourceUrl: z.string().nullable().describe('Source URL of the right document'),
        displayName: z.string().nullable().describe('Display name of the right document')
      }),
      isPublic: z.boolean().describe('Whether the comparison is publicly accessible'),
      creationTime: z.string().describe('UTC timestamp when the comparison was created'),
      expiryTime: z
        .string()
        .nullable()
        .describe('UTC timestamp when the comparison will expire'),
      ready: z.boolean().describe('Whether the comparison processing is complete'),
      failed: z.boolean().nullable().describe('Whether the comparison processing failed'),
      errorMessage: z.string().nullable().describe('Error message if the comparison failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.createComparison({
      left: {
        fileType: ctx.input.left.fileType,
        sourceUrl: ctx.input.left.sourceUrl,
        displayName: ctx.input.left.displayName
      },
      right: {
        fileType: ctx.input.right.fileType,
        sourceUrl: ctx.input.right.sourceUrl,
        displayName: ctx.input.right.displayName
      },
      identifier: ctx.input.comparisonIdentifier,
      isPublic: ctx.input.isPublic,
      expiryTime: ctx.input.expiryTime
    });

    return {
      output: {
        comparisonIdentifier: result.identifier,
        left: result.left,
        right: result.right,
        isPublic: result.isPublic,
        creationTime: result.creationTime,
        expiryTime: result.expiryTime,
        ready: result.ready,
        failed: result.failed,
        errorMessage: result.errorMessage
      },
      message: `Created comparison **${result.identifier}** comparing ${result.left.fileType} ↔ ${result.right.fileType}. Status: ${result.ready ? 'ready' : 'processing'}.`
    };
  })
  .build();
