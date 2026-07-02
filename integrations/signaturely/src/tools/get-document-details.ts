import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocumentDetails = SlateTool.create(spec, {
  name: 'Get Document Signers',
  key: 'get_document_signers',
  description: `Retrieves the list of signers for a specific document, including their signing status and contact information.
Use this to check who has signed a document and who is still pending.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to retrieve signers for')
    })
  )
  .output(
    z.object({
      signers: z
        .array(
          z.object({
            signerId: z.string().describe('Unique identifier of the signer'),
            name: z.string().optional().describe('Name of the signer'),
            email: z.string().optional().describe('Email address of the signer'),
            role: z.string().optional().describe('Role assigned to this signer'),
            status: z.string().optional().describe('Signing status of this signer'),
            signedAt: z
              .string()
              .optional()
              .describe('ISO timestamp when the signer completed signing'),
            order: z.number().optional().describe('Signing order position')
          })
        )
        .describe('List of signers for the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info({ message: 'Fetching document signers', documentId: ctx.input.documentId });

    let result = await client.getDocumentSigners(ctx.input.documentId);

    let items = result.items || result || [];
    let signers = (Array.isArray(items) ? items : []).map((signer: any) => ({
      signerId: signer.id?.toString() || '',
      name: signer.name || signer.fullName || undefined,
      email: signer.email || undefined,
      role: signer.role || undefined,
      status: signer.status || undefined,
      signedAt: signer.signedAt || signer.completedAt || undefined,
      order: signer.order ?? undefined
    }));

    return {
      output: {
        signers
      },
      message: `Found **${signers.length}** signer(s) for document ${ctx.input.documentId}.`
    };
  })
  .build();
