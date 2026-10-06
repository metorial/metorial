import { getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import {
  downloadPdf,
  faxOutput,
  inboundDownload,
  pdfUrl,
  signatureExpiry
} from '../lib/files';
import { invalid } from '../lib/native';
import { spec } from '../spec';

export const getFax = SlateTool.create(spec, {
  key: 'get_fax',
  name: 'Get Fax',
  description:
    'Read the exact asynchronous fax state and optionally prepare its PDF for download. Delivered outbound PDFs require stored media. Completed inbound faxes support native media-URL refresh; outgoing renewal is not documented.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      faxId: z.string().min(1),
      download: z
        .boolean()
        .default(false)
        .describe(
          'Prepare an available PDF for download; PDFs are limited to 16 MiB when content delivery is necessary'
        ),
      refreshMediaUrl: z
        .boolean()
        .default(false)
        .describe(
          'Refresh media_url only for a completed inbound fax; this is a native URL lifecycle operation'
        )
    })
  )
  .output(
    z.object({
      faxId: z.string(),
      connectionId: z.string(),
      from: z.string(),
      to: z.string(),
      status: z.string(),
      direction: z.string(),
      failureReason: z.string().nullish(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      fileName: z.string().optional(),
      mimeType: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new TelnyxClient(ctx.auth);
    const fax = ctx.input.refreshMediaUrl
      ? await client.refreshInboundFax(ctx.input.faxId)
      : await client.getFax(ctx.input.faxId);
    if (ctx.input.download) {
      if (!['received', 'delivered'].includes(fax.status))
        invalid(
          'The fax PDF is not ready. Read native status again after processing completes.',
          'file_not_ready'
        );
      const value = fax.direction === 'inbound' ? fax.media_url : fax.stored_media_url;
      if (!value)
        invalid(
          'No stored PDF is available. Outgoing faxes require storeMedia at send time; it cannot be enabled retrospectively.',
          'file_unavailable'
        );
      const url = pdfUrl(value),
        expiresAt = signatureExpiry(url);
      if (fax.direction === 'inbound' && expiresAt) {
        await ctx.addAttachment({
          type: 'url',
          url,
          mimeType: 'application/pdf',
          refreshAt: expiresAt,
          refreshReference: {
            faxId: fax.id,
            connectionId: fax.connection_id,
            from: fax.from,
            to: fax.to,
            direction: fax.direction
          }
        });
      } else {
        await ctx.addAttachment({
          type: 'content',
          content: await downloadPdf(value),
          filename: `fax-${fax.id}.pdf`,
          mimeType: 'application/pdf'
        });
      }
    }
    return {
      output: {
        ...faxOutput(fax),
        ...(ctx.input.download
          ? { fileName: `fax-${fax.id}.pdf`, mimeType: 'application/pdf' }
          : {})
      },
      message: `Fax ${fax.id}: native status ${fax.status}${ctx.input.download ? '; PDF prepared for download' : ''}.`
    };
  })
  .build();
export const getFileUrl = getFileUrlTool(spec, async ctx =>
  inboundDownload(new TelnyxClient(ctx.auth), ctx.input.reference)
);
