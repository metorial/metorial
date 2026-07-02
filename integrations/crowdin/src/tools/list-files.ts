import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listFilesTool = SlateTool.create(spec, {
  name: 'List Source Files',
  key: 'list_files',
  description: `List source files in a Crowdin project. Optionally filter by branch, directory, or name. Also supports listing directories and branches.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      resourceType: z
        .enum(['files', 'directories', 'branches'])
        .default('files')
        .describe('Type of resources to list'),
      branchId: z.number().optional().describe('Filter files/directories by branch ID'),
      directoryId: z.number().optional().describe('Filter files by directory ID'),
      filter: z.string().optional().describe('Filter files by name'),
      limit: z.number().optional().describe('Maximum number of results (max 500, default 25)'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      items: z.array(
        z.object({
          resourceId: z.number().describe('Resource ID'),
          name: z.string().describe('Resource name'),
          type: z.string().describe('Resource type (file, directory, branch)'),
          path: z.string().optional().describe('File path within the project'),
          title: z.string().optional().describe('Human-readable title'),
          branchId: z.number().optional().describe('Parent branch ID'),
          directoryId: z.number().optional().describe('Parent directory ID'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      ),
      pagination: z.object({
        offset: z.number(),
        limit: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { projectId, resourceType } = ctx.input;
    let items: any[] = [];
    let result: any;

    if (resourceType === 'branches') {
      result = await client.listBranches(projectId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      items = result.data.map((item: any) => ({
        resourceId: item.data.id,
        name: item.data.name,
        type: 'branch',
        title: item.data.title || undefined,
        createdAt: item.data.createdAt
      }));
    } else if (resourceType === 'directories') {
      result = await client.listDirectories(projectId, {
        branchId: ctx.input.branchId,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      items = result.data.map((item: any) => ({
        resourceId: item.data.id,
        name: item.data.name,
        type: 'directory',
        title: item.data.title || undefined,
        branchId: item.data.branchId || undefined,
        directoryId: item.data.directoryId || undefined,
        createdAt: item.data.createdAt
      }));
    } else {
      result = await client.listFiles(projectId, {
        branchId: ctx.input.branchId,
        directoryId: ctx.input.directoryId,
        filter: ctx.input.filter,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      items = result.data.map((item: any) => ({
        resourceId: item.data.id,
        name: item.data.name,
        type: 'file',
        path: item.data.path || undefined,
        title: item.data.title || undefined,
        branchId: item.data.branchId || undefined,
        directoryId: item.data.directoryId || undefined,
        createdAt: item.data.createdAt
      }));
    }

    return {
      output: {
        items,
        pagination: result.pagination
      },
      message: `Found **${items.length}** ${resourceType}.`
    };
  })
  .build();
