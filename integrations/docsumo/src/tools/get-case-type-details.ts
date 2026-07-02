import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCaseTypeDetails = SlateTool.create(spec, {
  name: 'Get Case Type Details',
  key: 'get_case_type_details',
  description: `Retrieve the configuration for a Docsumo case type, including stages, case fields, associated document types, workflow settings, and stage-wise counts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      casetypeId: z.string().describe('Case type ID. Get this from the List Agents tool.')
    })
  )
  .output(
    z.object({
      casetypeId: z.string().describe('Requested case type ID'),
      caseType: z.record(z.string(), z.any()).describe('Docsumo case type details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let caseType = await client.getCaseTypeDetails(ctx.input.casetypeId);

    return {
      output: {
        casetypeId: ctx.input.casetypeId,
        caseType
      },
      message: `Retrieved case type details for **${ctx.input.casetypeId}**.`
    };
  })
  .build();
