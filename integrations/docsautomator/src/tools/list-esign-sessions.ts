import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signerSchema = z.object({
  email: z.string().optional().describe('Signer email address.'),
  name: z.string().optional().describe('Signer name.'),
  status: z
    .string()
    .optional()
    .describe('Signer status (pending, invited, opened, signed, declined).'),
  signedAt: z.string().optional().describe('Timestamp when the signer signed.')
});

let sessionSchema = z.object({
  sessionId: z.string().optional().describe('Unique identifier for the signing session.'),
  documentName: z.string().optional().describe('Name of the document being signed.'),
  status: z
    .string()
    .optional()
    .describe(
      'Session status (pending, in_progress, completed, expired, cancelled, declined).'
    ),
  signers: z.array(signerSchema).optional().describe('List of signers and their statuses.'),
  createdAt: z.string().optional().describe('When the session was created.'),
  completedAt: z.string().optional().describe('When the session was completed.')
});

export let listEsignSessions = SlateTool.create(spec, {
  name: 'List E-Sign Sessions',
  key: 'list_esign_sessions',
  description: `Lists e-signature sessions with optional filtering by status, signer email, and pagination. Returns session details including signer statuses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['pending', 'in_progress', 'completed', 'expired', 'cancelled', 'declined'])
        .optional()
        .describe('Filter sessions by status.'),
      signerEmail: z.string().optional().describe('Filter sessions by signer email address.'),
      page: z.number().optional().describe('Page number for pagination (default: 1).'),
      limit: z
        .number()
        .optional()
        .describe('Number of results per page (default: 20, max: 100).')
    })
  )
  .output(
    z.object({
      sessions: z.array(sessionSchema).describe('List of e-signature sessions.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, unknown> = {};
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.signerEmail) params.email = ctx.input.signerEmail;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.limit) params.limit = ctx.input.limit;

    let result = await client.listEsignSessions(params as any);

    let sessions = Array.isArray(result) ? result : result.sessions || [];

    return {
      output: {
        sessions: sessions.map((s: any) => ({
          sessionId: s.sessionId || s._id || s.id,
          documentName: s.documentName,
          status: s.status,
          signers: s.signers?.map((signer: any) => ({
            email: signer.email,
            name: signer.name,
            status: signer.status,
            signedAt: signer.signedAt
          })),
          createdAt: s.createdAt,
          completedAt: s.completedAt
        }))
      },
      message: `Found **${sessions.length}** e-signature session(s).`
    };
  })
  .build();
