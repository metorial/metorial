import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getIssuanceSession = SlateTool.create(spec, {
  name: 'Get Issuance Session',
  key: 'get_issuance_session',
  description: `Retrieve details of a credential issuance session. Use this to check the current status of an OpenID4VC or DIDComm issuance offer, including whether the credential has been accepted by the holder.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      protocol: z.enum(['openid4vc', 'didcomm']).describe('Protocol used for the issuance'),
      issuanceId: z.string().describe('ID of the issuance session to retrieve')
    })
  )
  .output(
    z.object({
      issuanceId: z.string().describe('ID of the issuance session'),
      status: z.string().describe('Current status of the issuance'),
      projectId: z.string().optional().describe('Project ID'),
      credentials: z.any().optional().describe('Credential details'),
      offerUri: z.string().optional().describe('Offer URI (openid4vc)'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result: any;
    if (ctx.input.protocol === 'openid4vc') {
      result = await client.getOpenId4VcIssuance(ctx.input.issuanceId);
    } else {
      result = await client.getDidcommIssuance(ctx.input.issuanceId);
    }

    let data = result.data ?? result;

    return {
      output: {
        issuanceId: data.id,
        status: data.status,
        projectId: data.projectId,
        credentials: data.credentials ?? data.credential,
        offerUri: data.offerUri,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      },
      message: `Issuance session \`${data.id}\` status: **${data.status}**.`
    };
  })
  .build();
