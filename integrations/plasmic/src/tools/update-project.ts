import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProjectClient } from '../lib/client';
import { spec } from '../spec';

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Programmatically create or update components, pages, and design tokens in a Plasmic project via the Write API. Components can be matched by UUID, name, or path for updating. Design tokens support colors, spacing, fonts, shadows, and other styling values. **Requires a project secret token (enterprise only).**`,
  instructions: [
    'Components are matched for update by UUID first, then by name, then by path.',
    'Set `isPage` to true when creating a page rather than a component.',
    'Token types include: color, spacing, font-family, font-size, line-height, opacity, box-shadow.'
  ],
  constraints: [
    'Write API access requires a secret token, currently only available to enterprise customers.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      components: z
        .array(
          z.object({
            name: z.string().describe('Name of the component or page'),
            uuid: z.string().optional().describe('UUID of an existing component to update'),
            path: z.string().optional().describe('URL path for pages'),
            isPage: z
              .boolean()
              .optional()
              .describe('Whether this is a page (true) or a component (false)'),
            tplTree: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Element tree structure defining the component content')
          })
        )
        .optional()
        .describe('Components or pages to create or update'),
      tokens: z
        .array(
          z.object({
            name: z.string().describe('Name of the design token'),
            type: z
              .string()
              .describe(
                'Token type (e.g., color, spacing, font-family, font-size, line-height, opacity, box-shadow)'
              ),
            value: z.string().describe('Token value (e.g., hex color, pixel value, font name)')
          })
        )
        .optional()
        .describe('Design tokens to create or update')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.unknown()).describe('Response from the Write API')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.projectId || !ctx.auth.projectToken) {
      throw new Error('Project ID and project token are required');
    }
    if (!ctx.auth.projectSecretToken) {
      throw new Error(
        'Project secret token is required for write operations (enterprise only)'
      );
    }

    let client = new ProjectClient({
      projectId: ctx.auth.projectId,
      projectToken: ctx.auth.projectToken,
      projectSecretToken: ctx.auth.projectSecretToken
    });

    let body: Record<string, unknown> = {};
    if (ctx.input.components) {
      body.upsertComponents = ctx.input.components;
    }
    if (ctx.input.tokens) {
      body.upsertTokens = ctx.input.tokens;
    }

    let result = await client.updateProject(body as any);

    let parts: string[] = [];
    if (ctx.input.components?.length) {
      parts.push(`${ctx.input.components.length} component(s)`);
    }
    if (ctx.input.tokens?.length) {
      parts.push(`${ctx.input.tokens.length} token(s)`);
    }

    return {
      output: { result },
      message: `Updated project with ${parts.join(' and ')}.`
    };
  })
  .build();
