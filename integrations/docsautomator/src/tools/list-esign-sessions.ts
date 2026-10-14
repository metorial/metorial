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
      page: z
        .number()
        .min(1)
        .refine(Number.isInteger, 'The page must be a whole number.')
        .optional()
        .describe('Page number for pagination (default: 1).'),
      limit: z
        .number()
        .min(1)
        .max(250)
        .refine(Number.isInteger, 'The limit must be a whole number.')
        .optional()
        .describe('Number of results per page (default: 20, max: 250).')
    })
  )
  .output(
    z.object({
      sessions: z.array(sessionSchema).describe('List of e-signature sessions.'),
      pagination: z
        .object({
          page: z.number().optional(),
          limit: z.number().optional(),
          total: z.number().optional(),
          pages: z.number().optional()
        })
        .optional()
        .describe(
          'Current page and total pages. Request the next page while page is less than pages.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listEsignSessions({
      status: ctx.input.status,
      email: ctx.input.signerEmail,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let sessions = Array.isArray(result) ? result : result.sessions || [];

    return {
      output: {
        sessions: sessions.map((s: any) => ({
          sessionId: s.sessionId || s._id || s.id,
          documentName: s.documentName ?? undefined,
          status: s.status ?? undefined,
          signers: s.signers?.map((signer: any) => ({
            email: signer.email ?? undefined,
            name: signer.name ?? undefined,
            status: signer.status ?? undefined,
            signedAt: signer.signedAt ?? undefined
          })),
          createdAt: s.createdAt ?? undefined,
          completedAt: s.completedAt ?? undefined
        })),
        pagination: result.pagination
          ? {
              page: result.pagination.page ?? undefined,
              limit: result.pagination.limit ?? undefined,
              total: result.pagination.total ?? undefined,
              pages: result.pagination.pages ?? undefined
            }
          : undefined
      },
      message: `Found **${sessions.length}** e-signature session(s).`
    };
  })
  .build();
