import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runWorkflow = SlateTool.create(spec, {
  name: 'Run Workflow',
  key: 'run_workflow',
  description: `Execute a pre-configured Pdf4me workflow with a document. Workflows are reusable processing pipelines created in the Pdf4me dashboard that chain multiple operations together.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded document file content'),
      fileName: z.string().describe('File name with extension'),
      workflowName: z
        .string()
        .describe(
          'Name of the Pdf4me workflow to execute (as configured in the Pdf4me dashboard)'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Workflow execution status'),
      jobId: z.string().describe('Job ID for tracking the workflow execution')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.startWorkflow({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      wfName: ctx.input.workflowName
    });

    return {
      output: result,
      message: `Workflow **${ctx.input.workflowName}** started. Job ID: \`${result.jobId}\`, Status: ${result.status}`
    };
  })
  .build();
