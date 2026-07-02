import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeuronWriterClient } from '../lib/client';
import { spec } from '../spec';

export let importContent = SlateTool.create(spec, {
  name: 'Import Content',
  key: 'import_content',
  description: `Import content into the NeuronWriter editor for a query, creating a new content revision. You can provide raw HTML directly or a URL to auto-import from. When importing from a URL, you can optionally specify an HTML container selector to extract content from a specific section of the page.`,
  instructions: [
    'Provide either html or sourceUrl, not both.',
    'The containerId and containerClass options only apply when importing from a URL.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      queryId: z.string().describe('Query ID to import content into'),
      html: z.string().optional().describe('Raw HTML content to import'),
      sourceUrl: z.string().optional().describe('URL to auto-import content from'),
      title: z.string().optional().describe('Content title'),
      metaDescription: z.string().optional().describe('Meta description'),
      containerId: z
        .string()
        .optional()
        .describe('HTML element ID to extract content from (URL import only)'),
      containerClass: z
        .string()
        .optional()
        .describe('HTML element class to extract content from (URL import only)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Import result status'),
      error: z.string().optional().describe('Error message if import failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeuronWriterClient(ctx.auth.token);

    let result = await client.importContent({
      queryId: ctx.input.queryId,
      html: ctx.input.html,
      url: ctx.input.sourceUrl,
      title: ctx.input.title,
      description: ctx.input.metaDescription,
      containerId: ctx.input.containerId,
      containerClass: ctx.input.containerClass
    });

    let message =
      result.status === 'ok'
        ? 'Content imported successfully.'
        : `Import completed with status: **${result.status}**${result.error ? ` - ${result.error}` : ''}`;

    return {
      output: {
        status: result.status,
        error: result.error
      },
      message
    };
  })
  .build();
