import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let includeSchema = z.enum(['doctypes', 'fields', 'approvals', 'exports', 'documents']);

export let getCaseOverview = SlateTool.create(spec, {
  name: 'Get Case Overview',
  key: 'get_case_overview',
  description: `Retrieve a Docsumo case overview. Optionally include related document types, fields, approvals, exports, and documents.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      casetypeId: z.string().describe('Case type ID. Get this from the List Agents tool.'),
      caseId: z.string().describe('Case ID. Get this from the List Cases tool.'),
      include: z
        .array(includeSchema)
        .optional()
        .describe('Related sections to include in the case overview')
    })
  )
  .output(
    z.object({
      casetypeId: z.string().describe('Case type ID'),
      caseId: z.string().describe('Case ID'),
      overview: z.record(z.string(), z.any()).describe('Docsumo case overview')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let overview = await client.getCaseOverview({
      casetypeId: ctx.input.casetypeId,
      caseId: ctx.input.caseId,
      include: ctx.input.include
    });

    return {
      output: {
        casetypeId: ctx.input.casetypeId,
        caseId: ctx.input.caseId,
        overview
      },
      message: `Retrieved overview for case **${ctx.input.caseId}**.`
    };
  })
  .build();
