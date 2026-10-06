import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description:
    'Read details of a Griptape Cloud structure, retriever, data source, or tool. Discover resource IDs with list_structures, list_retrievers, list_data_connectors, or list_griptape_tools. Retriever details include component IDs and query input schemas; tool details include activity input schemas.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      resourceType: z.enum(['structure', 'retriever', 'data_connector', 'tool']),
      resourceId: z.string().min(1).describe('Resource ID from the matching list tool.')
    })
  )
  .output(
    z.object({
      resourceId: z.string(),
      resourceType: z.string(),
      name: z.string(),
      description: z.string().optional(),
      organizationId: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
      bucketId: z.string().optional(),
      dataConnectorType: z.string().optional(),
      deploymentId: z.string().optional(),
      retrieverComponentIds: z.array(z.string()).optional(),
      querySchema: z.unknown().optional(),
      activitySchema: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    const id = ctx.input.resourceId;
    const kind = ctx.input.resourceType;
    const result =
      kind === 'structure'
        ? await client.getStructure(id)
        : kind === 'retriever'
          ? await client.getRetriever(id)
          : kind === 'data_connector'
            ? await client.getDataConnector(id)
            : await client.getTool(id);
    return {
      output: {
        resourceId: result[`${kind}_id`],
        resourceType: kind,
        name: result.name,
        description: result.description,
        organizationId: result.organization_id,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        bucketId: result.bucket_id,
        dataConnectorType: kind === 'data_connector' ? result.type : undefined,
        deploymentId: result.latest_deployment_id,
        retrieverComponentIds: result.retriever_components?.map(
          (component: { retriever_component_id: string }) => component.retriever_component_id
        ),
        querySchema: result.retriever_components_schema,
        activitySchema: kind === 'tool' ? await client.getToolOpenApi(id) : undefined
      },
      message: `Retrieved ${kind} **${result.name}**.`
    };
  })
  .build();
