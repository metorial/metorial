import { SlateTool } from 'slates';
import { z } from 'zod';
import { businessNxtReadAccess } from '../lib/scopes';
import { spec } from '../spec';
import {
  companyNoSchema,
  createBusinessNxtClient,
  providerSchema,
  resolveCompanyNo
} from './common';

export let getAssociate = SlateTool.create(spec, {
  name: 'Get Associate',
  key: 'get_associate',
  description:
    'Get one Business NXT associate by associate, customer, or supplier number in a company.',
  tags: {
    readOnly: true
  }
})
  .scopes(businessNxtReadAccess)
  .input(
    z.object({
      companyNo: companyNoSchema,
      lookupType: z
        .enum(['associateNo', 'customerNo', 'supplierNo'])
        .describe('Which Business NXT associate identifier to look up.'),
      lookupNo: z.number().int().positive().describe('Identifier value for lookupType.')
    })
  )
  .output(
    z.object({
      associate: z
        .object({
          associateNo: z.number().nullable().optional(),
          customerNo: z.number().nullable().optional(),
          supplierNo: z.number().nullable().optional(),
          name: z.string().nullable().optional(),
          provider: providerSchema
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createBusinessNxtClient(ctx.auth);
    let associate = await client.getAssociate({
      companyNo: resolveCompanyNo(ctx.input.companyNo, ctx.config.selectedCompanyNo),
      lookupType: ctx.input.lookupType,
      lookupNo: ctx.input.lookupNo
    });

    return {
      output: {
        associate
      },
      message: associate
        ? `Retrieved associate **${ctx.input.lookupNo}**.`
        : `No associate found for **${ctx.input.lookupType}=${ctx.input.lookupNo}**.`
    };
  })
  .build();
