import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIssuedCredentials = SlateTool.create(spec, {
  name: 'List Issued Credentials',
  key: 'list_issued_credentials',
  description: `Retrieve metadata about issued credentials in a Paradym project. Use this to track the status of credentials, filter by format or revocation status, and find credential IDs for revocation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of credentials to return per page'),
      pageAfter: z.string().optional().describe('Cursor for fetching the next page'),
      filterStatus: z
        .string()
        .optional()
        .describe('Filter by status (e.g. "active", "revoked")'),
      filterFormat: z
        .string()
        .optional()
        .describe('Filter by format (e.g. "sd-jwt-vc", "anoncreds")'),
      filterCredentialTemplateId: z
        .string()
        .optional()
        .describe('Filter by credential template ID')
    })
  )
  .output(
    z.object({
      credentials: z
        .array(
          z.object({
            issuedCredentialId: z.string().describe('ID of the issued credential'),
            status: z.string().optional().describe('Credential status (active, revoked)'),
            format: z.string().optional().describe('Credential format'),
            credentialTemplateId: z.string().optional().describe('Template used for issuance'),
            revocable: z
              .boolean()
              .optional()
              .describe('Whether the credential can be revoked'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
          })
        )
        .describe('List of issued credentials')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let filter: Record<string, string> = {};
    if (ctx.input.filterStatus) filter.status = ctx.input.filterStatus;
    if (ctx.input.filterFormat) filter.format = ctx.input.filterFormat;
    if (ctx.input.filterCredentialTemplateId)
      filter.credentialTemplateId = ctx.input.filterCredentialTemplateId;

    let result = await client.listIssuedCredentials({
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageAfter,
      filter: Object.keys(filter).length > 0 ? filter : undefined
    });

    let credentials = (result.data ?? []).map((c: any) => ({
      issuedCredentialId: c.id,
      status: c.status,
      format: c.format,
      credentialTemplateId: c.credentialTemplateId,
      revocable: c.revocable,
      createdAt: c.createdAt
    }));

    return {
      output: { credentials },
      message: `Found **${credentials.length}** issued credential(s).`
    };
  })
  .build();
