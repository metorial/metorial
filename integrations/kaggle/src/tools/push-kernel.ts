import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

export let pushKernel = SlateTool.create(spec, {
  name: 'Push Notebook',
  key: 'push_kernel',
  description: `Create or update a Kaggle notebook (kernel) and execute it. Push source code to run as a notebook or script. The execution is asynchronous — use "Get Notebook Details" to check the run status afterward.`,
  instructions: [
    'The slug format is "username/kernel-slug". If updating, use the same slug as the existing kernel.',
    'Set enableGpu or enableTpu to true if your code requires GPU/TPU acceleration.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      slug: z.string().describe('Kernel slug in "username/kernel-slug" format'),
      newTitle: z
        .string()
        .optional()
        .describe('Title for the kernel (required when creating new)'),
      code: z.string().describe('Source code for the kernel'),
      language: z.enum(['python', 'r', 'rmarkdown']).describe('Programming language'),
      kernelType: z.enum(['notebook', 'script']).describe('Kernel type'),
      isPrivate: z.boolean().optional().describe('Whether the kernel should be private'),
      enableGpu: z.boolean().optional().describe('Whether to enable GPU acceleration'),
      enableTpu: z.boolean().optional().describe('Whether to enable TPU acceleration'),
      enableInternet: z
        .boolean()
        .optional()
        .describe('Whether to enable internet access during execution'),
      datasetDataSources: z
        .array(z.string())
        .optional()
        .describe('Dataset references to attach (e.g., ["owner/dataset-slug"])'),
      competitionDataSources: z
        .array(z.string())
        .optional()
        .describe('Competition slugs to attach as data sources'),
      kernelDataSources: z
        .array(z.string())
        .optional()
        .describe('Other kernel references to attach as data sources'),
      categoryIds: z
        .array(z.string())
        .optional()
        .describe('Category IDs to tag the kernel with')
    })
  )
  .output(
    z
      .object({
        ref: z.string().optional().describe('Reference to the pushed kernel'),
        url: z.string().optional().describe('URL of the kernel'),
        versionNumber: z.number().optional().describe('Version number of the pushed kernel'),
        error: z.string().optional().describe('Error message if push failed')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);
    let result = await client.pushKernel({
      slug: ctx.input.slug,
      newTitle: ctx.input.newTitle,
      text: ctx.input.code,
      language: ctx.input.language,
      kernelType: ctx.input.kernelType,
      isPrivate: ctx.input.isPrivate,
      enableGpu: ctx.input.enableGpu,
      enableTpu: ctx.input.enableTpu,
      enableInternet: ctx.input.enableInternet,
      datasetDataSources: ctx.input.datasetDataSources,
      competitionDataSources: ctx.input.competitionDataSources,
      kernelDataSources: ctx.input.kernelDataSources,
      categoryIds: ctx.input.categoryIds
    });

    return {
      output: result ?? {},
      message: `Pushed notebook **${ctx.input.slug}**. Execution has been queued — check status using "Get Notebook Details".`
    };
  })
  .build();
