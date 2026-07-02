import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listCredentials = SlateTool.create(spec, {
  name: 'List Credentials',
  key: 'list_credentials',
  description: `Retrieve metadata for all issued credentials. Returns credential IDs, issuer info, creation dates, algorithm, revocation status, and other metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Number of items to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of items to return (max 64)')
    })
  )
  .output(
    z.object({
      credentials: z.array(
        z.object({
          credentialId: z.string().describe('Credential ID'),
          issuerKey: z.string().optional().describe('Issuer key identifier'),
          issuerName: z.string().optional().describe('Issuer display name'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          expiryDate: z.string().optional().nullable().describe('Expiration date'),
          issuanceDate: z.string().optional().describe('Issuance date'),
          algorithm: z.string().optional().describe('Signature algorithm used'),
          revoked: z.boolean().optional().describe('Whether the credential is revoked')
        })
      ),
      total: z.number().optional().describe('Total number of credentials')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listCredentials({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let list = Array.isArray(result) ? result : result?.list || [];
    let total = result?.total;

    let credentials = list.map((c: any) => ({
      credentialId: c.id || '',
      issuerKey: c.issuerKey,
      issuerName: c.issuerName,
      createdAt: c.createdAt,
      expiryDate: c.expiryDate,
      issuanceDate: c.issuanceDate,
      algorithm: c.algorithm,
      revoked: c.revoked
    }));

    return {
      output: { credentials, total },
      message: `Found **${credentials.length}** credential(s)${total != null ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
