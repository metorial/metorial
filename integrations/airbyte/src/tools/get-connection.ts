import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getConnectionTool = SlateTool.create(spec, {
  name: 'Get Connection',
  key: 'get_connection',
  description: `Retrieve detailed information about a specific Airbyte connection, including its source, destination, schedule, stream configurations, and sync settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('The UUID of the connection to retrieve.')
    })
  )
  .output(
    z.object({
      connectionId: z.string(),
      name: z.string(),
      sourceId: z.string(),
      destinationId: z.string(),
      workspaceId: z.string(),
      status: z.string(),
      schedule: z
        .object({
          scheduleType: z.string(),
          cronExpression: z.string().optional()
        })
        .optional(),
      dataResidency: z.string(),
      namespaceDefinition: z.string().optional(),
      namespaceFormat: z.string().optional(),
      prefix: z.string().optional(),
      nonBreakingSchemaUpdatesBehavior: z.string().optional(),
      configurations: z.any().optional(),
      createdAt: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let conn = await client.getConnection(ctx.input.connectionId);

    return {
      output: {
        connectionId: conn.connectionId,
        name: conn.name,
        sourceId: conn.sourceId,
        destinationId: conn.destinationId,
        workspaceId: conn.workspaceId,
        status: conn.status,
        schedule: conn.schedule
          ? {
              scheduleType: conn.schedule.scheduleType,
              cronExpression: conn.schedule.cronExpression
            }
          : undefined,
        dataResidency: conn.dataResidency,
        namespaceDefinition: conn.namespaceDefinition,
        namespaceFormat: conn.namespaceFormat,
        prefix: conn.prefix,
        nonBreakingSchemaUpdatesBehavior: conn.nonBreakingSchemaUpdatesBehavior,
        configurations: conn.configurations,
        createdAt: conn.createdAt
      },
      message: `Retrieved connection **${conn.name}** (status: ${conn.status}).`
    };
  })
  .build();
