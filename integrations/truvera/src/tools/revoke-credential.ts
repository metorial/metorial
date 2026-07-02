import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let revokeCredential = SlateTool.create(spec, {
  name: 'Revoke or Unrevoke Credential',
  key: 'revoke_credential',
  description: `Revoke or unrevoke one or more credentials in a revocation registry. Revoked credentials will fail verification. Unrevoking restores verifiability. The credentials must have been issued with a revocation registry.`,
  instructions: [
    'Credentials must have been linked to the registry at issuance time.',
    'Unrevoking is only possible if the registry was not created with addOnly mode.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      registryId: z.string().describe('ID of the revocation registry'),
      credentialIds: z.array(z.string()).describe('Credential IDs to revoke or unrevoke'),
      action: z.enum(['revoke', 'unrevoke']).default('revoke').describe('Action to perform')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Background job ID for the operation'),
      registryId: z.string().describe('The revocation registry ID'),
      action: z.string().describe('The action performed'),
      credentialIds: z.array(z.string()).describe('Credential IDs affected')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result =
      ctx.input.action === 'revoke'
        ? await client.revokeCredentials(ctx.input.registryId, ctx.input.credentialIds)
        : await client.unrevokeCredentials(ctx.input.registryId, ctx.input.credentialIds);

    let jobId = result?.id || result?.jobId;

    return {
      output: {
        jobId: jobId ? String(jobId) : undefined,
        registryId: ctx.input.registryId,
        action: ctx.input.action,
        credentialIds: ctx.input.credentialIds
      },
      message: `${ctx.input.action === 'revoke' ? 'Revoked' : 'Unrevoked'} **${ctx.input.credentialIds.length}** credential(s) in registry **${ctx.input.registryId}**.`
    };
  })
  .build();
