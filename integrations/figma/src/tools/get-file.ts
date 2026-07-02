import { SlateTool } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve a Figma file's structure, layers, and metadata. Returns the full JSON tree of nodes with properties like dimensions, colors, text, and effects. Optionally request specific nodes by ID or limit traversal depth.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('The key of the Figma file (found in the file URL)'),
      nodeIds: z
        .array(z.string())
        .optional()
        .describe('Specific node IDs to retrieve. If omitted, returns the full file'),
      version: z
        .string()
        .optional()
        .describe('File version ID to retrieve a specific version'),
      depth: z
        .number()
        .optional()
        .describe('Depth of the node tree to return. Omit for full depth'),
      geometry: z.string().optional().describe('Set to "paths" to include vector path data'),
      branchData: z.boolean().optional().describe('Include branch metadata if true')
    })
  )
  .output(
    z.object({
      fileName: z.string().describe('Name of the file'),
      lastModified: z.string().describe('Last modified timestamp'),
      thumbnailUrl: z.string().optional().describe('URL of the file thumbnail'),
      version: z.string().optional().describe('Current version of the file'),
      role: z.string().optional().describe('User role on the file'),
      editorType: z.string().optional().describe('Editor type (figma or figjam)'),
      document: z.any().describe('Root document node containing all layers'),
      components: z
        .record(z.string(), z.any())
        .optional()
        .describe('Map of component metadata by node ID'),
      styles: z
        .record(z.string(), z.any())
        .optional()
        .describe('Map of style metadata by style ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);

    let result: any;

    if (ctx.input.nodeIds?.length) {
      result = await client.getFileNodes(ctx.input.fileKey, ctx.input.nodeIds, {
        version: ctx.input.version,
        depth: ctx.input.depth,
        geometry: ctx.input.geometry
      });

      return {
        output: {
          fileName: result.name,
          lastModified: result.lastModified,
          thumbnailUrl: result.thumbnailUrl,
          version: result.version,
          role: result.role,
          editorType: result.editorType,
          document: result.nodes,
          components: result.components,
          styles: result.styles
        },
        message: `Retrieved ${ctx.input.nodeIds.length} node(s) from file **${result.name}**`
      };
    }

    result = await client.getFile(ctx.input.fileKey, {
      version: ctx.input.version,
      depth: ctx.input.depth,
      geometry: ctx.input.geometry,
      branchData: ctx.input.branchData
    });

    return {
      output: {
        fileName: result.name,
        lastModified: result.lastModified,
        thumbnailUrl: result.thumbnailUrl,
        version: result.version,
        role: result.role,
        editorType: result.editorType,
        document: result.document,
        components: result.components,
        styles: result.styles
      },
      message: `Retrieved file **${result.name}** (last modified: ${result.lastModified})`
    };
  })
  .build();
