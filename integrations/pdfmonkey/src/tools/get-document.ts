import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve details of a specific document including its status, download URL, preview URL, and generation logs. Use this to check the status of an async generation, get a fresh download URL (they expire after 1 hour), or inspect generation errors.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to retrieve')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the document'),
      templateId: z.string().describe('ID of the template used'),
      status: z
        .string()
        .describe('Current status: draft, pending, generating, success, or failure'),
      downloadUrl: z
        .string()
        .nullable()
        .describe('URL to download the generated file (valid for 1 hour)'),
      previewUrl: z.string().nullable().describe('URL to preview the document'),
      publicShareLink: z
        .string()
        .nullable()
        .describe('Public share link (Premium plans only)'),
      filename: z.string().nullable().describe('Filename of the generated document'),
      outputType: z.string().nullable().describe('Output format: pdf or image'),
      meta: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Document metadata returned by PDFMonkey'),
      failureCause: z.string().nullable().describe('Error message if generation failed'),
      checksum: z.string().nullable().describe('Checksum of the generated document'),
      generationLogs: z
        .array(
          z.object({
            type: z.string().describe('Log entry type: info or error'),
            message: z.string().describe('Log message'),
            timestamp: z.string().describe('Timestamp of the log entry')
          })
        )
        .nullable()
        .describe('Logs from the generation process'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let doc = await client.getDocument(ctx.input.documentId);

    let logs = doc.generation_logs as Record<string, unknown>[] | null;

    let output = {
      documentId: String(doc.id),
      templateId: String(doc.document_template_id),
      status: String(doc.status),
      downloadUrl: doc.download_url ? String(doc.download_url) : null,
      previewUrl: doc.preview_url ? String(doc.preview_url) : null,
      publicShareLink: doc.public_share_link ? String(doc.public_share_link) : null,
      filename: doc.filename ? String(doc.filename) : null,
      outputType: doc.output_type ? String(doc.output_type) : null,
      meta:
        doc.meta && typeof doc.meta === 'object'
          ? (doc.meta as Record<string, unknown>)
          : null,
      failureCause: doc.failure_cause ? String(doc.failure_cause) : null,
      checksum: doc.checksum ? String(doc.checksum) : null,
      generationLogs: logs
        ? logs.map(log => ({
            type: String(log.type),
            message: String(log.message),
            timestamp: String(log.timestamp)
          }))
        : null,
      createdAt: String(doc.created_at),
      updatedAt: String(doc.updated_at)
    };

    let statusMsg =
      output.status === 'success'
        ? `Document **${output.documentId}** is ready.`
        : output.status === 'failure'
          ? `Document **${output.documentId}** failed: ${output.failureCause}`
          : `Document **${output.documentId}** status: **${output.status}**.`;

    return {
      output,
      message: statusMsg
    };
  })
  .build();
