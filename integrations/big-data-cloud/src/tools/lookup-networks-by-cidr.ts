import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { networkSchema } from '../lib/schemas';
import { spec } from '../spec';

export let lookupNetworksByCidrTool = SlateTool.create(spec, {
  name: 'Look Up Networks by CIDR',
  key: 'lookup_networks_by_cidr',
  description:
    'Inspect BGP networks and subnet allocations within an IPv4 CIDR range. Supports subnetwork pagination and a hierarchy depth limit.',
  instructions: [
    'Use subnetsOffset and subnetsBatchSize to page through subnets. Narrow the CIDR range or depthLimit if the provider reports too many results.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      cidr: z.string().min(1).describe('IPv4 CIDR range, such as 8.0.0.0/8'),
      depthLimit: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of sub-prefix hierarchy levels to include'),
      subnetsBatchSize: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Subnet entries per page; default and maximum 20'),
      subnetsOffset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of subnet entries to skip; default 0')
    })
  )
  .output(
    z
      .object({
        cidr: z.string(),
        parent: z.string().optional(),
        networks: z
          .array(
            z
              .object({ Cidr: z.string().optional(), Type: z.string().optional() })
              .passthrough()
          )
          .optional(),
        network: networkSchema.optional(),
        totalSubnets: z.number().optional(),
        subnets: z
          .array(
            z
              .object({
                startAddress: z.string().optional(),
                endAddress: z.string().optional(),
                isCellular: z.boolean().optional(),
                organisation: z.string().optional(),
                registeredCountry: z.string().optional(),
                registeredCountryName: z.string().optional()
              })
              .passthrough()
          )
          .optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let result = await new Client({
      token: ctx.auth.token,
      localityLanguage: ctx.config.localityLanguage
    }).networkByCidr(ctx.input);
    return { output: result, message: `Retrieved networks within ${ctx.input.cidr}.` };
  })
  .build();
