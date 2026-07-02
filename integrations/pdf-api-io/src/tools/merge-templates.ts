import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mergeTemplates = SlateTool.create(spec, {
  name: 'Merge Templates',
  key: 'merge_templates',
  description: `Combine multiple PDF templates into a single PDF document. Each template receives its own set of dynamic data. Useful for generating multi-section documents such as an invoice combined with a shipping label in one API call. Returns either a base64-encoded PDF or a temporary download URL.`,
  instructions: [
    'Provide at least two templates to merge.',
    'Each template entry requires its own template ID and data object with the appropriate variables.'
  ],
  constraints: [
    'Rate limit: 60 requests per minute by default.',
    'Temporary download URLs expire after 15 minutes.'
  ]
})
  .input(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('ID of the template to include in the merged PDF'),
            templateData: z
              .record(z.string(), z.unknown())
              .describe("Key-value pairs matching this template's variables")
          })
        )
        .min(1)
        .describe('Array of templates to merge, each with its own dynamic data'),
      outputFormat: z
        .enum(['base64', 'url'])
        .default('base64')
        .describe(
          'Output format: "base64" for base64-encoded PDF, "url" for a temporary download URL valid for 15 minutes'
        )
    })
  )
  .output(
    z.object({
      base64: z
        .string()
        .optional()
        .describe('Base64-encoded merged PDF content (when outputFormat is "base64")'),
      downloadUrl: z
        .string()
        .optional()
        .describe(
          'Temporary download URL for the merged PDF, valid for 15 minutes (when outputFormat is "url")'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let outputOption = ctx.input.outputFormat === 'url' ? ('url' as const) : ('pdf' as const);

    let mergeEntries = ctx.input.templates.map(t => ({
      id: t.templateId,
      data: t.templateData
    }));

    let result = await client.mergeTemplates(mergeEntries, { output: outputOption });

    return {
      output: {
        base64: result.base64,
        downloadUrl: result.url
      },
      message: `Merged **${ctx.input.templates.length}** template(s) into a single PDF. ${ctx.input.outputFormat === 'url' ? 'Download URL provided (expires in 15 minutes).' : 'Returned as base64-encoded content.'}`
    };
  })
  .build();
