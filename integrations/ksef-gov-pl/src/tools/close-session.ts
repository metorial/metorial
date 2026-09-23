import { SlateTool } from 'slates';
import { z } from 'zod';
import { KsefClient } from '../lib/client';
import { spec } from '../spec';

export const closeSessionTool = SlateTool.create(spec, {
  name: 'Close Session',
  key: 'close_session',
  description:
    'Close an online invoice submission session by its reference number, including a session left open after a failed automatic close. This starts generation of the session receipt; check session status to track processing and receipt readiness.',
  constraints: [
    'The connected KSeF token must have InvoiceWrite, PefInvoiceWrite, or EnforcementOperations permission.',
    'Closing a session stops further invoice submission to that session.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      sessionReferenceNumber: z
        .string()
        .trim()
        .length(36)
        .describe('Reference number of the online invoice submission session to close.')
    })
  )
  .output(
    z.object({
      sessionReferenceNumber: z.string().describe('Reference number of the online session.'),
      closureRequested: z
        .boolean()
        .describe('Whether KSeF accepted the request to close this session.')
    })
  )
  .handleInvocation(async ctx => {
    const { sessionReferenceNumber } = ctx.input;
    const client = new KsefClient(ctx.auth);

    await client.request<void>(
      'close online session',
      'POST',
      `/sessions/online/${encodeURIComponent(sessionReferenceNumber)}/close`
    );

    return {
      output: { sessionReferenceNumber, closureRequested: true },
      message: `KSeF accepted the close request for online session **${sessionReferenceNumber}**. Check its status for invoice processing and receipt availability.`
    };
  })
  .build();
