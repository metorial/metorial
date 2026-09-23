import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KsefClient } from '../lib/client';
import { spec } from '../spec';

const UPO_MIME_TYPE = 'application/xml';

const sessionStatusSchema = z.object({
  status: z.object({
    code: z.number().int(),
    description: z.string(),
    details: z.array(z.string()).nullish()
  }),
  upo: z
    .object({
      pages: z.array(z.object({ referenceNumber: z.string().min(1) }))
    })
    .nullish()
});

function unavailableUpoMessage(status: z.infer<typeof sessionStatusSchema>['status']): string {
  const statusDetails = status.details?.length
    ? ` Details: ${status.details.join('; ')}.`
    : '';
  const statusSummary = `KSeF session status: ${status.description} (code ${status.code}).${statusDetails}`;

  if (status.code === 100) {
    return `The session is still open, so its UPO is unavailable. ${statusSummary} Close the session, then check get_session_status for UPO page references.`;
  }
  if (status.code === 150 || status.code === 170) {
    return `The session UPO is not available yet. ${statusSummary} Check get_session_status again after processing finishes.`;
  }
  if (status.code === 200) {
    return `KSeF reported a processed session but returned no UPO pages. ${statusSummary} Check get_session_status again, and contact KSeF support if no page appears.`;
  }
  return `KSeF returned no UPO pages for this session. ${statusSummary} Inspect get_session_status and resolve the reported session state before retrying.`;
}

export const downloadSessionUpoTool = SlateTool.create(spec, {
  name: 'Download Session UPO',
  key: 'download_session_upo',
  description: 'Download a generated XML receipt page for an invoice submission session.',
  instructions: [
    'Call get_session_status to discover the available UPO page references for the session.'
  ],
  constraints: [
    'The connected KSeF token must have InvoiceWrite, Introspection, PefInvoiceWrite, or EnforcementOperations permission.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      sessionReferenceNumber: z
        .string()
        .trim()
        .min(1)
        .describe('Reference number of the invoice submission session.'),
      upoReferenceNumber: z
        .string()
        .trim()
        .min(1)
        .describe('UPO page reference from get_session_status for this session.')
    })
  )
  .output(
    z.object({
      sessionReferenceNumber: z
        .string()
        .describe('Reference number of the invoice submission session.'),
      upoReferenceNumber: z.string().describe('Reference number of the downloaded UPO page.'),
      fileName: z.string().describe('Suggested name for the downloaded XML file.'),
      mimeType: z.string().describe('MIME type of the UPO file.')
    })
  )
  .handleInvocation(async ctx => {
    const { sessionReferenceNumber, upoReferenceNumber } = ctx.input;
    const client = new KsefClient(ctx.auth);
    const response = await client.request<unknown>(
      'get session status',
      'GET',
      `/sessions/${encodeURIComponent(sessionReferenceNumber)}`,
      { safeRead: true }
    );
    const parsedSession = sessionStatusSchema.safeParse(response);
    if (!parsedSession.success) {
      throw createApiServiceError(
        'KSeF returned an invalid session status response. Retry get_session_status before downloading the UPO.'
      );
    }
    const session = parsedSession.data;

    const pages = session.upo?.pages ?? [];
    if (pages.length === 0) {
      throw createApiServiceError(unavailableUpoMessage(session.status));
    }
    if (!pages.some(page => page.referenceNumber === upoReferenceNumber)) {
      throw createApiServiceError(
        'This UPO reference is not available for the session. Call get_session_status and use one of its UPO page references.'
      );
    }

    const fileName = `${upoReferenceNumber}.xml`;
    await ctx.addAttachment({
      type: 'url',
      url: client.downloadUrl(
        `/sessions/${encodeURIComponent(sessionReferenceNumber)}/upo/${encodeURIComponent(upoReferenceNumber)}`
      ),
      mimeType: UPO_MIME_TYPE,
      headers: client.attachmentHeaders()
    });

    return {
      output: {
        sessionReferenceNumber,
        upoReferenceNumber,
        fileName,
        mimeType: UPO_MIME_TYPE
      },
      message: `Prepared session UPO **${upoReferenceNumber}** for download.`
    };
  })
  .build();
