import { SlateTool } from 'slates';
import { z } from 'zod';
import { parseResource, sensitivity, text } from '../lib/contracts';
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
  description: `Get the current (latest) state version for a workspace, including fully paginated public outputs. Sensitive values are always hidden. Returns state metadata and output values that can be used by other workspaces.`,
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
      outputsReady: z
        .boolean()
        .optional()
        .describe(
          'Whether the provider finished extracting outputs; false is a pending state, not an empty result'
        ),
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

    const outputs = stateVersion.resourcesProcessed
      ? (await client.getStateVersionOutputs(stateVersion.stateVersionId)).data.map(value => {
          const output = parseResource(value, 'state-version-outputs');
          const a = output.attributes;
          return {
            outputId: output.id,
            name: text(a.name),
            sensitive: sensitivity(a.sensitive),
            type: text(a.type),
            value: sensitivity(a.sensitive) ? null : (a.value ?? null)
          };
        })
      : [];

    return {
      output: { stateVersion, outputs, outputsReady: stateVersion.resourcesProcessed },
      message: `Current state version: serial **${stateVersion.serial}** (${stateVersion.stateVersionId}), ${stateVersion.resourcesProcessed ? `with **${outputs.length}** output(s).` : '— outputs are still processing; retry after resourcesProcessed becomes true.'}`
    };
  })
  .build();
