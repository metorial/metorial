import { SlateTool } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

let componentSchema = z.object({
  componentKey: z.string().describe('Unique component key'),
  name: z.string().describe('Component name'),
  description: z.string().optional().describe('Component description'),
  fileKey: z.string().optional().describe('File key containing this component'),
  nodeId: z.string().optional().describe('Node ID of the component'),
  thumbnailUrl: z.string().optional().describe('Thumbnail URL for the component'),
  createdAt: z.string().optional().describe('When the component was created'),
  updatedAt: z.string().optional().describe('When the component was last updated'),
  containingFrame: z
    .object({
      name: z.string().optional(),
      nodeId: z.string().optional(),
      pageId: z.string().optional(),
      pageName: z.string().optional()
    })
    .optional()
    .describe('Frame containing this component')
});

export let getComponents = SlateTool.create(spec, {
  name: 'Get Components',
  key: 'get_components',
  description: `Retrieve published components from a Figma team or file. Returns component metadata including name, description, key, thumbnail, and containing frame. Use team-level for browsing the design system, or file-level for a specific file's components.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().optional().describe('Team ID to get all team components'),
      fileKey: z
        .string()
        .optional()
        .describe('File key to get components from a specific file'),
      componentKey: z
        .string()
        .optional()
        .describe('Specific component key to get details for a single component'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of components to return (team-level only)'),
      cursor: z.number().optional().describe('Pagination cursor (team-level only)')
    })
  )
  .output(
    z.object({
      components: z.array(componentSchema).describe('List of components'),
      cursor: z.number().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);

    if (ctx.input.componentKey) {
      let result = await client.getComponent(ctx.input.componentKey);
      let comp = result.meta;
      return {
        output: {
          components: [
            {
              componentKey: comp.key,
              name: comp.name,
              description: comp.description,
              fileKey: comp.file_key,
              nodeId: comp.node_id,
              thumbnailUrl: comp.thumbnail_url,
              createdAt: comp.created_at,
              updatedAt: comp.updated_at,
              containingFrame: comp.containing_frame
                ? {
                    name: comp.containing_frame.name,
                    nodeId: comp.containing_frame.nodeId,
                    pageId: comp.containing_frame.pageId,
                    pageName: comp.containing_frame.pageName
                  }
                : undefined
            }
          ]
        },
        message: `Retrieved component **${comp.name}**`
      };
    }

    if (ctx.input.fileKey) {
      let result = await client.getFileComponents(ctx.input.fileKey);
      let components = (result.meta?.components || []).map((c: any) => ({
        componentKey: c.key,
        name: c.name,
        description: c.description,
        fileKey: c.file_key,
        nodeId: c.node_id,
        thumbnailUrl: c.thumbnail_url,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        containingFrame: c.containing_frame
          ? {
              name: c.containing_frame.name,
              nodeId: c.containing_frame.nodeId,
              pageId: c.containing_frame.pageId,
              pageName: c.containing_frame.pageName
            }
          : undefined
      }));

      return {
        output: { components },
        message: `Found **${components.length}** component(s) in file`
      };
    }

    if (ctx.input.teamId) {
      let result = await client.getTeamComponents(ctx.input.teamId, {
        pageSize: ctx.input.pageSize,
        after: ctx.input.cursor
      });

      let components = (result.meta?.components || []).map((c: any) => ({
        componentKey: c.key,
        name: c.name,
        description: c.description,
        fileKey: c.file_key,
        nodeId: c.node_id,
        thumbnailUrl: c.thumbnail_url,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        containingFrame: c.containing_frame
          ? {
              name: c.containing_frame.name,
              nodeId: c.containing_frame.nodeId,
              pageId: c.containing_frame.pageId,
              pageName: c.containing_frame.pageName
            }
          : undefined
      }));

      return {
        output: {
          components,
          cursor: result.meta?.cursor?.after
        },
        message: `Found **${components.length}** component(s) in team`
      };
    }

    throw new Error('Provide at least one of teamId, fileKey, or componentKey');
  })
  .build();
