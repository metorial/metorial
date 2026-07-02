import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signerDetailSchema = z.object({
  email: z.string().optional().describe('Signer email address.'),
  name: z.string().optional().describe('Signer name.'),
  status: z
    .string()
    .optional()
    .describe('Signer status (pending, invited, opened, signed, declined).'),
  signedAt: z.string().optional().describe('Timestamp when the signer signed.')
});

export let getEsignSession = SlateTool.create(spec, {
  name: 'Get E-Sign Session',
  key: 'get_esign_session',
  description: `Retrieves detailed information about a specific e-signature session including signer statuses, document hashes, completion timestamps, and optionally signing links and audit trail.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The e-signature session ID.'),
      includeLinks: z
        .boolean()
        .optional()
        .describe(
          'Also retrieve signing links for all signers (used with manual delivery mode).'
        ),
      includeAudit: z
        .boolean()
        .optional()
        .describe('Also retrieve the full chronological audit trail.')
    })
  )
  .output(
    z.object({
      sessionId: z.string().optional().describe('Session identifier.'),
      documentName: z.string().optional().describe('Name of the document.'),
      status: z.string().optional().describe('Session status.'),
      signers: z.array(signerDetailSchema).optional().describe('Signer details and statuses.'),
      createdAt: z.string().optional().describe('When the session was created.'),
      completedAt: z.string().optional().describe('When the session was completed.'),
      signedPdfUrl: z
        .string()
        .optional()
        .describe('URL of the signed PDF (available when completed).'),
      signingLinks: z
        .array(
          z.object({
            email: z.string().optional().describe('Signer email.'),
            signingLink: z.string().optional().describe('Signing URL for the signer.'),
            status: z.string().optional().describe('Link status.'),
            expiresAt: z.string().optional().describe('When the signing link expires.')
          })
        )
        .optional()
        .describe('Signing links for each signer (only if includeLinks is true).'),
      auditTrail: z
        .array(
          z.object({
            eventType: z.string().optional().describe('Audit event type.'),
            timestamp: z.string().optional().describe('When the event occurred.'),
            description: z.string().optional().describe('Event description.')
          })
        )
        .optional()
        .describe('Chronological audit trail (only if includeAudit is true).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let session = await client.getEsignSession(ctx.input.sessionId);

    let output: Record<string, unknown> = {
      sessionId: session.sessionId || session._id || session.id,
      documentName: session.documentName,
      status: session.status,
      signers: session.signers?.map((s: any) => ({
        email: s.email,
        name: s.name,
        status: s.status,
        signedAt: s.signedAt
      })),
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      signedPdfUrl: session.signedPdfUrl
    };

    if (ctx.input.includeLinks) {
      let links = await client.getEsignSessionLinks(ctx.input.sessionId);
      let linksArray = Array.isArray(links) ? links : links.links || links.signingLinks || [];
      output.signingLinks = linksArray.map((l: any) => ({
        email: l.email,
        signingLink: l.signingLink || l.link,
        status: l.status,
        expiresAt: l.expiresAt
      }));
    }

    if (ctx.input.includeAudit) {
      let audit = await client.getEsignSessionAudit(ctx.input.sessionId);
      let auditArray = Array.isArray(audit) ? audit : audit.events || audit.auditTrail || [];
      output.auditTrail = auditArray.map((e: any) => ({
        eventType: e.eventType || e.type || e.event,
        timestamp: e.timestamp || e.createdAt,
        description: e.description || e.message
      }));
    }

    return {
      output: output as any,
      message: `E-sign session **${ctx.input.sessionId}**: status **${session.status}**${session.signedPdfUrl ? `. [Signed PDF](${session.signedPdfUrl})` : ''}`
    };
  })
  .build();
