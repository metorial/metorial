import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSignRequest = SlateTool.create(spec, {
  name: 'Manage Sign Request',
  key: 'manage_sign_request',
  description: `Create, view, list, or cancel Box Sign e-signature requests. Send documents for signature to one or more signers with configurable options.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'cancel'])
        .describe('The sign request operation to perform'),
      signRequestId: z
        .string()
        .optional()
        .describe('Sign request ID (required for get and cancel)'),
      signers: z
        .array(
          z.object({
            email: z.string().describe('Signer email address'),
            role: z
              .enum(['signer', 'approver', 'final_copy_reader'])
              .optional()
              .describe('Signer role'),
            order: z.number().optional().describe('Signing order (for sequential signing)')
          })
        )
        .optional()
        .describe('List of signers (required for create)'),
      sourceFileIds: z
        .array(z.string())
        .optional()
        .describe('IDs of files to be signed (required for create)'),
      parentFolderId: z
        .string()
        .optional()
        .describe('Folder ID where signed documents will be stored (required for create)'),
      name: z.string().optional().describe('Name for the sign request'),
      emailSubject: z
        .string()
        .optional()
        .describe('Custom email subject for the signature request'),
      emailMessage: z.string().optional().describe('Custom email message body'),
      isDocumentPreparationNeeded: z
        .boolean()
        .optional()
        .describe('Whether document preparation UI should be shown before sending'),
      daysValid: z.number().optional().describe('Number of days the request remains valid'),
      limit: z.number().optional().describe('Max results for list action'),
      marker: z.string().optional().describe('Pagination marker for list action')
    })
  )
  .output(
    z.object({
      signRequestId: z.string().optional().describe('ID of the sign request'),
      status: z.string().optional().describe('Current status of the sign request'),
      name: z.string().optional().describe('Name of the sign request'),
      signers: z
        .array(
          z.object({
            email: z.string(),
            role: z.string().optional(),
            signerDecision: z.string().optional()
          })
        )
        .optional()
        .describe('Signer details and statuses'),
      cancelled: z.boolean().optional().describe('True if the request was cancelled'),
      signRequests: z
        .array(
          z.object({
            signRequestId: z.string(),
            status: z.string().optional(),
            name: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional()
        .describe('List of sign requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      action,
      signRequestId,
      signers,
      sourceFileIds,
      parentFolderId,
      name,
      emailSubject,
      emailMessage,
      isDocumentPreparationNeeded,
      daysValid,
      limit,
      marker
    } = ctx.input;

    if (action === 'list') {
      let data = await client.listSignRequests(limit, marker);
      let mapped = (data.entries || []).map((sr: any) => ({
        signRequestId: sr.id,
        status: sr.status,
        name: sr.name,
        createdAt: sr.created_at
      }));
      return {
        output: { signRequests: mapped },
        message: `Found ${mapped.length} sign request(s).`
      };
    }

    if (action === 'get') {
      if (!signRequestId) throw new Error('signRequestId is required for get action');
      let sr = await client.getSignRequest(signRequestId);
      return {
        output: {
          signRequestId: sr.id,
          status: sr.status,
          name: sr.name,
          signers: (sr.signers || []).map((s: any) => ({
            email: s.email,
            role: s.role,
            signerDecision: s.signer_decision?.type
          }))
        },
        message: `Sign request **${sr.name || sr.id}** is in status **${sr.status}**.`
      };
    }

    if (action === 'cancel') {
      if (!signRequestId) throw new Error('signRequestId is required for cancel action');
      await client.cancelSignRequest(signRequestId);
      return {
        output: { signRequestId, cancelled: true },
        message: `Cancelled sign request ${signRequestId}.`
      };
    }

    // create
    if (!signers || signers.length === 0)
      throw new Error('signers are required for create action');
    if (!sourceFileIds || sourceFileIds.length === 0)
      throw new Error('sourceFileIds are required for create action');
    if (!parentFolderId) throw new Error('parentFolderId is required for create action');

    let sr = await client.createSignRequest({
      signers,
      sourceFiles: sourceFileIds.map(id => ({ id })),
      parentFolderId,
      name,
      emailSubject,
      emailMessage,
      isDocumentPreparationNeeded,
      daysValid
    });

    return {
      output: {
        signRequestId: sr.id,
        status: sr.status,
        name: sr.name,
        signers: (sr.signers || []).map((s: any) => ({
          email: s.email,
          role: s.role,
          signerDecision: s.signer_decision?.type
        }))
      },
      message: `Created sign request **${sr.name || sr.id}** with ${signers.length} signer(s).`
    };
  });
