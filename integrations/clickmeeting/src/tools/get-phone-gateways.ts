import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPhoneGateways = SlateTool.create(spec, {
  name: 'Get Phone Gateways',
  key: 'get_phone_gateways',
  description: `Retrieves available phone gateway numbers with geographic data for dial-in conference access.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      gateways: z.array(z.record(z.string(), z.unknown())).describe('List of phone gateways')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getPhoneGateways();
    let gateways = Array.isArray(result) ? result : [];

    return {
      output: { gateways },
      message: `Retrieved **${gateways.length}** phone gateway(s).`
    };
  })
  .build();
