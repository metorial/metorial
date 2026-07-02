import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runCaseWorkflow = SlateTool.create(spec, {
  name: 'Run Case Workflow',
  key: 'run_case_workflow',
  description: `Trigger the workflow associated with a Docsumo case type for one case. The workflow may continue asynchronously after Docsumo accepts the request.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      casetypeId: z.string().describe('Case type ID. Get this from the List Agents tool.'),
      caseId: z.string().describe('Case ID whose workflow should run')
    })
  )
  .output(
    z.object({
      casetypeId: z.string().describe('Case type ID'),
      caseId: z.string().describe('Case ID'),
      status: z.string().describe('Docsumo response status'),
      statusCode: z.number().describe('Docsumo response status code'),
      message: z.string().optional().describe('Docsumo response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.runCaseWorkflow(ctx.input.casetypeId, ctx.input.caseId);

    return {
      output: {
        casetypeId: ctx.input.casetypeId,
        caseId: ctx.input.caseId,
        status: result.status,
        statusCode: result.statusCode,
        message: result.message
      },
      message: `Triggered workflow for Docsumo case **${ctx.input.caseId}**.`
    };
  })
  .build();
