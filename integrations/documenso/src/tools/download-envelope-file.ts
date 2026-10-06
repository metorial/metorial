import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { clientConfig, id, invalid } from '../lib/validation';
import { spec } from '../spec';

export const downloadEnvelopeFileTool = SlateTool.create(spec, {
  name: 'Download Envelope File',
  key: 'download_envelope_file',
  description:
    'Download an original, completed signed, or pending PDF item, an audit-log PDF, or a signing certificate for a document envelope.',
  tags: { readOnly: true },
  instructions: [
    'Use get_envelope to discover PDF item IDs. The selected item must belong to envelopeId.',
    'Signed PDFs and certificates require a completed DOCUMENT. Pending PDFs require PENDING status and are not final executed documents. Original PDFs are the provider-stored original version; uploads can undergo PDF normalization.',
    'Audit logs and certificates require a DOCUMENT envelope. Instance/team permissions also apply at download time.'
  ]
})
  .input(
    z.object({
      envelopeId: z.string().describe('Exact owning envelope ID'),
      fileType: z
        .enum(['item', 'audit_log', 'certificate'])
        .default('item')
        .describe('PDF item, document audit log, or signing certificate'),
      envelopeItemId: z
        .string()
        .optional()
        .describe('Required only for item; obtain it from get_envelope'),
      version: z
        .enum(['original', 'signed', 'pending'])
        .optional()
        .describe('For item only; defaults to signed')
    })
  )
  .output(
    z.object({
      envelopeId: z.string(),
      envelopeItemId: z.string().optional(),
      fileType: z.enum(['item', 'audit_log', 'certificate']),
      version: z.enum(['original', 'signed', 'pending']).optional(),
      fileName: z.string(),
      mimeType: z.literal('application/pdf')
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input,
      configuration = clientConfig(ctx);
    id(input.envelopeId);
    if (input.fileType === 'item') {
      if (input.envelopeItemId === undefined)
        throw invalid('Choose envelopeItemId from get_envelope.');
      id(input.envelopeItemId);
    } else if (input.envelopeItemId !== undefined || input.version !== undefined)
      throw invalid('envelopeItemId and version apply only to PDF items.');
    const e = await new Client(configuration).getEnvelope(input.envelopeId),
      version = input.fileType === 'item' ? (input.version ?? 'signed') : undefined;
    if (input.fileType !== 'item' && e.type !== 'DOCUMENT')
      throw invalid('Audit-log and certificate PDFs require a DOCUMENT envelope.');
    if (input.fileType === 'item' && !e.envelopeItems.some(i => i.id === input.envelopeItemId))
      throw invalid('The selected PDF item does not belong to this envelope.');
    if (
      (version === 'signed' || input.fileType === 'certificate') &&
      (e.type !== 'DOCUMENT' || e.status !== 'COMPLETED')
    )
      throw invalid(
        'A signed PDF or certificate requires a completed DOCUMENT envelope. Select original for its uploaded PDF.'
      );
    if (
      version === 'pending' &&
      (e.type !== 'DOCUMENT' || e.status !== 'PENDING' || e.internalVersion === 1)
    )
      throw invalid(
        'Pending PDF downloads require a PENDING document using the current envelope format; they are not final executed documents.'
      );
    const route =
      input.fileType === 'item'
        ? `/envelope/item/${input.envelopeItemId}/download`
        : `/envelope/${e.id}/${input.fileType === 'audit_log' ? 'audit-log' : 'certificate'}/download`;
    const fileName = `${input.envelopeItemId ?? e.id}-${version ?? input.fileType}.pdf`;
    await ctx.addAttachment({
      type: 'url',
      url: configuration.baseUrl + route,
      headers: { Authorization: configuration.token },
      query: version ? { version } : undefined,
      mimeType: 'application/pdf'
    });
    return {
      output: {
        envelopeId: e.id,
        envelopeItemId: input.envelopeItemId,
        fileType: input.fileType,
        version,
        fileName,
        mimeType: 'application/pdf'
      },
      message: `Prepared ${fileName} for download.`
    };
  })
  .build();
