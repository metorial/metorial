import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProjectClient } from '../lib/client';
import { spec } from '../spec';

export let renderComponent = SlateTool.create(spec, {
  name: 'Render Component',
  key: 'render_component',
  description: `Render a Plasmic-designed page or component as HTML via the Render API. Returns plain HTML that can be embedded anywhere. Supports rendering in preview, published, or versioned mode, with optional JavaScript hydration for interactivity. Component props and global variants can be customized.`,
  instructions: [
    'Use `preview` mode to see the latest revisions (even unpublished changes).',
    'Use `published` mode to only render published content.',
    'Use `versioned` mode with a version number to render a specific version.',
    'Custom code components are not available in this rendering mode.'
  ],
  constraints: [
    'HTML responses are cached by Plasmic servers. Use the `maxAge` parameter to control cache duration.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      componentName: z.string().describe('Name of the Plasmic component or page to render'),
      mode: z
        .enum(['preview', 'published', 'versioned'])
        .default('published')
        .describe('Rendering mode'),
      version: z.string().optional().describe('Version number when using versioned mode'),
      hydrate: z
        .boolean()
        .optional()
        .describe('Enable JavaScript hydration for interactivity'),
      embedHydrate: z
        .boolean()
        .optional()
        .describe('Embed hydration scripts inline in the HTML'),
      prepass: z.boolean().optional().describe('Enable server-side prefetching of content'),
      maxAge: z.number().optional().describe('Cache duration in seconds'),
      componentProps: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Override props of the component and specify active variants'),
      globalVariants: z
        .array(
          z.object({
            name: z.string().describe('Name of the global variant'),
            value: z.string().describe('Value to set for the global variant')
          })
        )
        .optional()
        .describe('Global variants to apply during rendering')
    })
  )
  .output(
    z.object({
      html: z.string().describe('Rendered HTML output of the component')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.projectId || !ctx.auth.projectToken) {
      throw new Error('Project ID and project token are required to render components');
    }

    let client = new ProjectClient({
      projectId: ctx.auth.projectId,
      projectToken: ctx.auth.projectToken
    });

    let result = await client.renderComponent({
      componentName: ctx.input.componentName,
      mode: ctx.input.mode,
      version: ctx.input.version,
      hydrate: ctx.input.hydrate,
      embedHydrate: ctx.input.embedHydrate,
      prepass: ctx.input.prepass,
      maxAge: ctx.input.maxAge,
      componentProps: ctx.input.componentProps,
      globalVariants: ctx.input.globalVariants
    });

    return {
      output: result,
      message: `Rendered component \`${ctx.input.componentName}\` in **${ctx.input.mode}** mode. HTML length: ${result.html.length} characters.`
    };
  })
  .build();
