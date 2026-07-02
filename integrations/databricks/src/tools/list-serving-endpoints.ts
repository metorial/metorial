import { SlateTool } from 'slates';
import { z } from 'zod';
import { DatabricksClient } from '../lib/client';
import { spec } from '../spec';

export let listServingEndpoints = SlateTool.create(spec, {
  name: 'List Serving Endpoints',
  key: 'list_serving_endpoints',
  description: `List all model serving endpoints in the workspace. Serving endpoints host ML models and foundation models as REST APIs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      endpoints: z
        .array(
          z.object({
            endpointName: z.string().describe('Serving endpoint name'),
            state: z.string().optional().describe('Endpoint state (READY, NOT_READY, etc.)'),
            creatorName: z.string().optional().describe('Creator username'),
            creationTimestamp: z.string().optional().describe('Creation time in epoch ms'),
            lastUpdatedTimestamp: z
              .string()
              .optional()
              .describe('Last update time in epoch ms'),
            endpointType: z.string().optional().describe('Endpoint type'),
            servedEntities: z
              .array(
                z.object({
                  entityName: z
                    .string()
                    .optional()
                    .describe('Name of the served model or entity'),
                  entityVersion: z
                    .string()
                    .optional()
                    .describe('Version of the served entity'),
                  state: z.string().optional().describe('Entity deployment state')
                })
              )
              .optional()
              .describe('Deployed entities/models')
          })
        )
        .describe('Model serving endpoints')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DatabricksClient({
      workspaceUrl: ctx.config.workspaceUrl,
      token: ctx.auth.token
    });

    let endpoints = await client.listServingEndpoints();

    let mapped = endpoints.map((e: any) => ({
      endpointName: e.name ?? '',
      state: e.state?.ready,
      creatorName: e.creator,
      creationTimestamp: e.creation_timestamp ? String(e.creation_timestamp) : undefined,
      lastUpdatedTimestamp: e.last_updated_timestamp
        ? String(e.last_updated_timestamp)
        : undefined,
      endpointType: e.endpoint_type,
      servedEntities: (e.config?.served_entities ?? e.config?.served_models ?? []).map(
        (s: any) => ({
          entityName: s.entity_name ?? s.model_name,
          entityVersion: s.entity_version ?? s.model_version,
          state: s.state?.deployment
        })
      )
    }));

    return {
      output: { endpoints: mapped },
      message: `Found **${mapped.length}** serving endpoint(s).`
    };
  })
  .build();
