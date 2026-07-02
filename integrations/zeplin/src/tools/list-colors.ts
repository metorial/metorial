import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

let colorSchema = z.object({
  colorId: z.string().optional().describe('Color identifier'),
  name: z.string().optional().describe('Color name'),
  r: z.number().optional().describe('Red channel (0-255)'),
  g: z.number().optional().describe('Green channel (0-255)'),
  b: z.number().optional().describe('Blue channel (0-255)'),
  a: z.number().optional().describe('Alpha channel (0-1)')
});

export let listColors = SlateTool.create(spec, {
  name: 'List Colors',
  key: 'list_colors',
  description: `List all colors from a Zeplin project or styleguide. Provide either a **projectId** or **styleguideId**. Supports pagination.`,
  instructions: ['Provide either projectId or styleguideId, not both.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('ID of the project (provide this or styleguideId)'),
      styleguideId: z
        .string()
        .optional()
        .describe('ID of the styleguide (provide this or projectId)'),
      limit: z.number().min(1).max(100).optional().describe('Number of results per page'),
      offset: z.number().min(0).optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      colors: z.array(colorSchema).describe('List of colors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);
    let colors: any[];

    if (ctx.input.projectId) {
      colors = (await client.listProjectColors(ctx.input.projectId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      })) as any[];
    } else if (ctx.input.styleguideId) {
      colors = (await client.listStyleguideColors(ctx.input.styleguideId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      })) as any[];
    } else {
      throw new Error('Either projectId or styleguideId must be provided');
    }

    let mapped = colors.map((c: any) => ({
      colorId: c.id,
      name: c.name,
      r: c.r,
      g: c.g,
      b: c.b,
      a: c.a
    }));

    return {
      output: { colors: mapped },
      message: `Found **${mapped.length}** color(s).`
    };
  })
  .build();

export let createProjectColor = SlateTool.create(spec, {
  name: 'Create Project Color',
  key: 'create_project_color',
  description: `Create a new color in a Zeplin project's local styleguide. Specify the RGBA values and a name.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      name: z.string().describe('Name for the color'),
      r: z.number().min(0).max(255).describe('Red channel (0-255)'),
      g: z.number().min(0).max(255).describe('Green channel (0-255)'),
      b: z.number().min(0).max(255).describe('Blue channel (0-255)'),
      a: z.number().min(0).max(1).describe('Alpha channel (0-1)')
    })
  )
  .output(
    z.object({
      colorId: z.string().optional().describe('ID of the created color'),
      name: z.string().optional().describe('Color name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let result = (await client.createProjectColor(ctx.input.projectId, {
      name: ctx.input.name,
      r: ctx.input.r,
      g: ctx.input.g,
      b: ctx.input.b,
      a: ctx.input.a
    })) as any;

    return {
      output: {
        colorId: result.id,
        name: result.name
      },
      message: `Created color **${ctx.input.name}** (rgba(${ctx.input.r}, ${ctx.input.g}, ${ctx.input.b}, ${ctx.input.a})).`
    };
  })
  .build();
