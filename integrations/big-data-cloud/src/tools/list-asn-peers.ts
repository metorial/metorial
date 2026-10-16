import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { asnSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listAsnPeersTool = SlateTool.create(spec, {
  name: 'List ASN Peers',
  key: 'list_asn_peers',
  description:
    'Page through an Autonomous System’s receiving-from or transit-to routing relationships beyond the capped peer lists returned by lookup_asn.',
  instructions: [
    'Use offset and batchSize to request successive pages. totalReceivingFrom or totalTransitTo gives the provider total when available.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      asn: z.string().min(1).describe('Autonomous System Number, such as 13335 or AS13335'),
      direction: z
        .enum(['receiving_from', 'transit_to'])
        .describe('Routing relationship to retrieve'),
      batchSize: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of peers to retrieve, at most 50'),
      offset: z.number().int().min(0).optional().describe('Number of peer entries to skip')
    })
  )
  .output(
    asnSchema.extend({
      asn: z.string(),
      totalReceivingFrom: z.number().optional(),
      totalTransitTo: z.number().optional(),
      receivingFrom: z.array(asnSchema).optional(),
      transitTo: z.array(asnSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({
      token: ctx.auth.token,
      localityLanguage: ctx.config.localityLanguage
    }).asnPeers(ctx.input);
    return {
      output: result,
      message: `Retrieved ${ctx.input.direction} peers for ${ctx.input.asn}.`
    };
  })
  .build();
