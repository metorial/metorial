import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

export let getKernelDetails = SlateTool.create(spec, {
  name: 'Get Notebook Details',
  key: 'get_kernel_details',
  description: `Retrieve source code and execution details for a specific Kaggle notebook (kernel). Optionally fetch execution output and run status. Provide the notebook reference as "username/kernel-slug".`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userName: z.string().describe('Kernel owner username'),
      kernelSlug: z.string().describe('Kernel slug/name'),
      includeOutput: z.boolean().optional().describe('Whether to include execution output'),
      includeStatus: z.boolean().optional().describe('Whether to include run status')
    })
  )
  .output(
    z.object({
      source: z
        .record(z.string(), z.any())
        .optional()
        .describe('Kernel source code and metadata'),
      output: z
        .record(z.string(), z.any())
        .optional()
        .describe('Kernel execution output files and log'),
      status: z.string().optional().describe('Current kernel execution status'),
      failureMessage: z.string().optional().describe('Failure message if execution failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);

    let source = await client.pullKernel(ctx.input.userName, ctx.input.kernelSlug);

    let output: any;
    let status: any;
    let failureMessage: any;

    if (ctx.input.includeOutput) {
      output = await client
        .getKernelOutput(ctx.input.userName, ctx.input.kernelSlug)
        .catch(() => null);
    }

    if (ctx.input.includeStatus) {
      let statusData = await client
        .getKernelStatus(ctx.input.userName, ctx.input.kernelSlug)
        .catch(() => null);
      status = statusData?.status;
      failureMessage = statusData?.failureMessage;
    }

    return {
      output: {
        source: source ?? undefined,
        output: output ?? undefined,
        status,
        failureMessage
      },
      message: `Retrieved notebook **${ctx.input.userName}/${ctx.input.kernelSlug}**${status ? ` (status: ${status})` : ''}.`
    };
  })
  .build();
