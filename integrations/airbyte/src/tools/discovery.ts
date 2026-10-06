import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { definitionSchema, organizationSchema } from '../lib/models';
import { publicConfiguration } from '../lib/validation';
import { spec } from '../spec';

export const getWorkspaceTool = SlateTool.create(spec, {
  key: 'get_workspace',
  name: 'Get Workspace',
  description:
    'Inspect a workspace discovered with list_workspaces, including its name, processing residency and notification configuration with private destination URLs masked.',
  tags: { readOnly: true }
})
  .input(z.object({ workspaceId: z.string().describe('Workspace ID from list_workspaces.') }))
  .output(
    z.object({
      workspaceId: z.string(),
      name: z.string(),
      dataResidency: z.string(),
      notifications: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    const workspace = await createClient(ctx).getWorkspace(ctx.input.workspaceId);
    return {
      output: { ...workspace, notifications: publicConfiguration(workspace.notifications) },
      message: `Retrieved workspace **${workspace.name}**.`
    };
  })
  .build();

export const listOrganizationsTool = SlateTool.create(spec, {
  key: 'list_organizations',
  name: 'List Organizations',
  description:
    'Discover the Airbyte organizations accessible to the authenticated application user. Use the returned IDs when creating workspaces or managing organization permissions.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ organizations: z.array(organizationSchema) }))
  .handleInvocation(async ctx => {
    const result = await createClient(ctx).listOrganizations();
    return {
      output: { organizations: result.data },
      message: `Found **${result.data.length}** organization(s).`
    };
  })
  .build();

const definitions = (kind: 'sources' | 'destinations') =>
  SlateTool.create(spec, {
    key: kind === 'sources' ? 'list_source_definitions' : 'list_destination_definitions',
    name: kind === 'sources' ? 'List Source Definitions' : 'List Destination Definitions',
    description: `Discover ${kind === 'sources' ? 'source' : 'destination'} connector definitions available to a workspace. Returns stable definition IDs, names, image versions and documentation URLs. Use custom definition IDs when provisioning connectors.`,
    tags: { readOnly: true }
  })
    .input(
      z.object({ workspaceId: z.string().describe('Workspace ID from list_workspaces.') })
    )
    .output(z.object({ definitions: z.array(definitionSchema), hasMore: z.boolean() }))
    .handleInvocation(async ctx => {
      const result = await createClient(ctx).listDefinitions(ctx.input.workspaceId, kind);
      return {
        output: { definitions: result.data, hasMore: Boolean(result.next) },
        message: `Found **${result.data.length}** connector definition(s).`
      };
    })
    .build();
export const listSourceDefinitionsTool = definitions('sources');
export const listDestinationDefinitionsTool = definitions('destinations');
