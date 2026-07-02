import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapPagination, mapStateVersion } from '../lib/mappers';
import { spec } from '../spec';

let stateVersionSchema = z.object({
  stateVersionId: z.string(),
  serial: z.number(),
  createdAt: z.string(),
  size: z.number(),
  terraformVersion: z.string(),
  resourcesProcessed: z.boolean()
});

export let listStateVersionsTool = SlateTool.create(spec, {
  name: 'List State Versions',
  key: 'list_state_versions',
  description: `List historical state versions for a workspace. Each state version represents a snapshot of the infrastructure state at a point in time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to list state versions for'),
      pageNumber: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      stateVersions: z.array(stateVersionSchema),
      pagination: z.object({
        currentPage: z.number(),
        totalPages: z.number(),
        totalCount: z.number(),
        pageSize: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.listStateVersions(ctx.input.workspaceId, {
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let stateVersions = (response.data || []).map(mapStateVersion);
    let pagination = mapPagination(response.meta);

    return {
      output: { stateVersions, pagination },
      message: `Found **${pagination.totalCount}** state version(s) for workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();

export let getCurrentStateTool = SlateTool.create(spec, {
  name: 'Get Current State',
  key: 'get_current_state',
  description: `Get the current (latest) state version for a workspace, including its outputs. Returns state metadata and all output values that can be used by other workspaces.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to get the current state for')
    })
  )
  .output(
    z.object({
      stateVersion: stateVersionSchema,
      outputs: z.array(
        z.object({
          outputId: z.string(),
          name: z.string(),
          sensitive: z.boolean(),
          type: z.string(),
          value: z.any()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.getCurrentStateVersion(ctx.input.workspaceId);
    let stateVersion = mapStateVersion(response.data);

    let outputs: Array<{
      outputId: string;
      name: string;
      sensitive: boolean;
      type: string;
      value: any;
    }> = [];
    try {
      let outputsResponse = await client.getStateVersionOutputs(stateVersion.stateVersionId);
      outputs = (outputsResponse.data || []).map((o: any) => ({
        outputId: o.id || '',
        name: o.attributes?.name || '',
        sensitive: o.attributes?.sensitive ?? false,
        type: o.attributes?.type || '',
        value: o.attributes?.value ?? null
      }));
    } catch {
      // outputs may not be available
    }

    return {
      output: { stateVersion, outputs },
      message: `Current state version: serial **${stateVersion.serial}** (${stateVersion.stateVersionId}), with **${outputs.length}** output(s).`
    };
  })
  .build();
