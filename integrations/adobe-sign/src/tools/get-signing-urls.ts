import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSigningUrls = SlateTool.create(spec, {
  name: 'Get Signing URLs',
  key: 'get_signing_urls',
  description: `Retrieve signing URLs for an agreement. These URLs can be used for embedded signing within your application. Only available when the agreement is waiting for one or more participants to sign.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      agreementId: z.string().describe('ID of the agreement to get signing URLs for')
    })
  )
  .output(
    z.object({
      signingUrlSetInfos: z
        .array(
          z.object({
            signingUrls: z
              .array(
                z.object({
                  email: z.string().optional().describe('Email of the signer'),
                  esignUrl: z.string().optional().describe('URL for e-signing')
                })
              )
              .describe('Signing URLs for participants in this set')
          })
        )
        .describe('Sets of signing URLs grouped by participant set')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.getSigningUrls(ctx.input.agreementId);

    let totalUrls = (result.signingUrlSetInfos || []).reduce(
      (sum: number, set: any) => sum + (set.signingUrls?.length || 0),
      0
    );

    return {
      output: {
        signingUrlSetInfos: result.signingUrlSetInfos || []
      },
      message: `Retrieved **${totalUrls}** signing URL(s) for agreement \`${ctx.input.agreementId}\`.`
    };
  });
