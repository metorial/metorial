import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let revokeCredentials = SlateTool.create(spec, {
  name: 'Revoke Credentials',
  key: 'revoke_credentials',
  description: `Batch-revoke one or more previously issued credentials. Supports both SD-JWT and AnonCreds credentials. Optionally notify the holder's wallet about the revocation via DIDComm Revocation Notification.`,
  instructions: ['Call list_projects to choose the projectId for this operation.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      issuedCredentialIds: z
        .array(z.string())
        .describe('IDs of the issued credentials to revoke'),
      notifyWallet: z
        .boolean()
        .optional()
        .describe(
          'Whether to send a DIDComm revocation notification to the holder wallet (default false)'
        )
    })
  )
  .output(
    z.object({
      revokedCredentials: z
        .array(
          z.object({
            issuedCredentialId: z.string().describe('ID of the revoked credential'),
            notifiedWallet: z.boolean().optional().describe('Whether the wallet was notified')
          })
        )
        .describe('Details of each revoked credential')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.input.projectId ?? ctx.config.projectId
    });

    if (!ctx.input.issuedCredentialIds.length) {
      throw createApiServiceError('Provide at least one issued credential ID to revoke.');
    }
    let result = await client.batchRevokeCredentials({
      issuedCredentialIds: ctx.input.issuedCredentialIds,
      notifyWallet: ctx.input.notifyWallet
    });

    let data = result.data ?? result;
    let revoked = (data.revokedCredentials ?? data ?? []).map((c: any) => ({
      issuedCredentialId: c.id ?? c.issuedCredentialId,
      notifiedWallet: c.notifiedWallet
    }));

    return {
      output: { revokedCredentials: revoked },
      message: `Revoked **${revoked.length}** credential(s).${ctx.input.notifyWallet ? ` ${revoked.filter((credential: { notifiedWallet?: boolean }) => credential.notifiedWallet).length} wallet notification(s) confirmed.` : ''}`
    };
  })
  .build();
