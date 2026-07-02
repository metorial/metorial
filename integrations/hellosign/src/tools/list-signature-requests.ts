import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSignatureRequests = SlateTool.create(spec, {
  name: 'List Signature Requests',
  key: 'list_signature_requests',
  description: `List signature requests with pagination and optional search filtering. Returns a summary of each request including title, status, and signer information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default 1)'),
      pageSize: z.number().optional().describe('Results per page, 1-100 (default 20)'),
      query: z.string().optional().describe('Search query to filter results')
    })
  )
  .output(
    z.object({
      signatureRequests: z
        .array(
          z.object({
            signatureRequestId: z.string().describe('Unique identifier'),
            title: z.string().optional().describe('Title of the request'),
            subject: z.string().optional().describe('Email subject'),
            isComplete: z.boolean().describe('Whether all signers have completed'),
            isDeclined: z.boolean().describe('Whether any signer has declined'),
            hasError: z.boolean().describe('Whether there are errors'),
            createdAt: z.string().optional().describe('Creation timestamp (ISO 8601)'),
            requesterEmailAddress: z.string().optional().describe('Requester email'),
            signerCount: z.number().describe('Number of signers'),
            signedCount: z.number().describe('Number of signers who have signed')
          })
        )
        .describe('List of signature requests'),
      page: z.number().describe('Current page'),
      numPages: z.number().describe('Total number of pages'),
      numResults: z.number().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.listSignatureRequests({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      query: ctx.input.query
    });

    let signatureRequests = result.signatureRequests.map((sr: any) => {
      let signatures = sr.signatures || [];
      let signedCount = signatures.filter((s: any) => s.status_code === 'signed').length;

      return {
        signatureRequestId: sr.signature_request_id,
        title: sr.title,
        subject: sr.subject,
        isComplete: sr.is_complete,
        isDeclined: sr.is_declined,
        hasError: sr.has_error,
        createdAt: sr.created_at ? new Date(sr.created_at * 1000).toISOString() : undefined,
        requesterEmailAddress: sr.requester_email_address,
        signerCount: signatures.length,
        signedCount
      };
    });

    return {
      output: {
        signatureRequests,
        page: result.listInfo.page,
        numPages: result.listInfo.numPages,
        numResults: result.listInfo.numResults
      },
      message: `Found **${result.listInfo.numResults}** signature request(s). Showing page ${result.listInfo.page} of ${result.listInfo.numPages}.`
    };
  })
  .build();
