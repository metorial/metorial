import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let getOrganisation = SlateTool.create(spec, {
  name: 'Get Organisation',
  key: 'get_organisation',
  description: `Retrieve the authenticated organisation's details, including name, settings, and configuration. Also supports listing branches and rate cards.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeBranches: z.boolean().optional().describe('Also fetch all branches'),
      includeRateCards: z.boolean().optional().describe('Also fetch all rate cards')
    })
  )
  .output(
    z.object({
      organisation: z.record(z.string(), z.any()).describe('Full organisation object'),
      branches: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Branches if requested'),
      rateCards: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Rate cards if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let organisation = await client.getOrganisation();

    let output: Record<string, any> = {
      organisation
    };

    if (ctx.input.includeBranches) {
      output.branches = await client.listBranches();
    }
    if (ctx.input.includeRateCards) {
      output.rateCards = await client.listRateCards();
    }

    return {
      output: output as any,
      message: `Retrieved organisation details.`
    };
  })
  .build();
