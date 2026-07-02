import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

let componentSchema = z.object({
  componentId: z.string().describe('Component identifier'),
  name: z.string().describe('Component name'),
  description: z.string().optional().describe('Component description'),
  thumbnail: z.string().optional().describe('Component thumbnail URL'),
  created: z.number().optional().describe('Creation timestamp'),
  updated: z.number().optional().describe('Last update timestamp')
});

export let listComponents = SlateTool.create(spec, {
  name: 'List Components',
  key: 'list_components',
  description: `List components from a Zeplin project or styleguide. Provide either a **projectId** or **styleguideId** to specify the source. Supports pagination.`,
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
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default: 30)'),
      offset: z.number().min(0).optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      components: z.array(componentSchema).describe('List of components')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);
    let components: any[];

    if (ctx.input.projectId) {
      components = (await client.listProjectComponents(ctx.input.projectId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      })) as any[];
    } else if (ctx.input.styleguideId) {
      components = (await client.listStyleguideComponents(ctx.input.styleguideId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      })) as any[];
    } else {
      throw new Error('Either projectId or styleguideId must be provided');
    }

    let mapped = components.map((c: any) => ({
      componentId: c.id,
      name: c.name,
      description: c.description,
      thumbnail: c.thumbnail,
      created: c.created,
      updated: c.updated
    }));

    return {
      output: { components: mapped },
      message: `Found **${mapped.length}** component(s).`
    };
  })
  .build();

export let getComponent = SlateTool.create(spec, {
  name: 'Get Component',
  key: 'get_component',
  description: `Retrieve detailed information about a specific component from a Zeplin project or styleguide. Provide either a **projectId** or **styleguideId**.`,
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
      componentId: z.string().describe('ID of the component to retrieve')
    })
  )
  .output(
    z.object({
      componentId: z.string().describe('Component identifier'),
      name: z.string().describe('Component name'),
      description: z.string().optional().describe('Component description'),
      thumbnail: z.string().optional().describe('Component thumbnail URL'),
      created: z.number().optional().describe('Creation timestamp'),
      updated: z.number().optional().describe('Last update timestamp'),
      sections: z.array(z.any()).optional().describe('Component sections'),
      versions: z.array(z.any()).optional().describe('Component version history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);
    let component: any;

    if (ctx.input.projectId) {
      component = await client.getProjectComponent(ctx.input.projectId, ctx.input.componentId);
    } else if (ctx.input.styleguideId) {
      component = await client.getStyleguideComponent(
        ctx.input.styleguideId,
        ctx.input.componentId
      );
    } else {
      throw new Error('Either projectId or styleguideId must be provided');
    }

    return {
      output: {
        componentId: component.id,
        name: component.name,
        description: component.description,
        thumbnail: component.thumbnail,
        created: component.created,
        updated: component.updated,
        sections: component.sections,
        versions: component.versions
      },
      message: `Retrieved component **${component.name}**.`
    };
  })
  .build();
