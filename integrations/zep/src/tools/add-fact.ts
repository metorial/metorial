import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addFact = SlateTool.create(spec, {
  name: 'Add Fact',
  key: 'add_fact',
  description: `Add a structured fact triple to a user's or group's knowledge graph. A fact triple consists of a source entity, a relationship, and a target entity. Use this to ingest business data, user interactions, transactions, or any structured knowledge.`,
  instructions: [
    'Provide either userId or graphId to specify the target graph.',
    'factName should be in ALL_CAPS_SNAKE_CASE format (e.g. WORKS_AT, PURCHASED).',
    'Use validAt/invalidAt timestamps for temporal facts that change over time.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fact: z
        .string()
        .describe('Human-readable description of the fact (e.g. "Alice works at Acme Corp")'),
      factName: z
        .string()
        .describe('Machine-readable fact name in ALL_CAPS_SNAKE_CASE (e.g. WORKS_AT)'),
      sourceNodeName: z.string().optional().describe('Name of the source entity'),
      targetNodeName: z.string().optional().describe('Name of the target entity'),
      sourceNodeUuid: z.string().optional().describe('UUID of an existing source node'),
      targetNodeUuid: z.string().optional().describe('UUID of an existing target node'),
      sourceNodeLabels: z
        .array(z.string())
        .optional()
        .describe('Labels/types for the source node'),
      targetNodeLabels: z
        .array(z.string())
        .optional()
        .describe('Labels/types for the target node'),
      sourceNodeAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom attributes for the source node (scalar values only)'),
      targetNodeAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom attributes for the target node (scalar values only)'),
      edgeAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom attributes for the edge (scalar values only)'),
      userId: z.string().optional().describe('User ID to add the fact to their graph'),
      graphId: z.string().optional().describe('Standalone graph ID to add the fact to'),
      createdAt: z.string().optional().describe('Timestamp when the fact was created'),
      validAt: z.string().optional().describe('Timestamp from which the fact is valid'),
      invalidAt: z
        .string()
        .optional()
        .describe('Timestamp from which the fact is no longer valid'),
      expiredAt: z.string().optional().describe('Timestamp when the fact expired')
    })
  )
  .output(
    z.object({
      sourceNode: z
        .object({
          uuid: z.string().describe('Source node UUID'),
          name: z.string().describe('Source node name'),
          summary: z.string().optional().nullable().describe('Source node summary'),
          labels: z.array(z.string()).optional().nullable().describe('Source node labels')
        })
        .optional()
        .nullable()
        .describe('The source node of the fact triple'),
      targetNode: z
        .object({
          uuid: z.string().describe('Target node UUID'),
          name: z.string().describe('Target node name'),
          summary: z.string().optional().nullable().describe('Target node summary'),
          labels: z.array(z.string()).optional().nullable().describe('Target node labels')
        })
        .optional()
        .nullable()
        .describe('The target node of the fact triple'),
      edge: z
        .object({
          uuid: z.string().describe('Edge UUID'),
          fact: z.string().describe('Fact text'),
          name: z.string().optional().nullable().describe('Edge name')
        })
        .optional()
        .nullable()
        .describe('The edge representing the relationship'),
      taskId: z.string().optional().nullable().describe('Background processing task ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.addFactTriple({
      fact: ctx.input.fact,
      factName: ctx.input.factName,
      sourceNodeName: ctx.input.sourceNodeName,
      targetNodeName: ctx.input.targetNodeName,
      sourceNodeUuid: ctx.input.sourceNodeUuid,
      targetNodeUuid: ctx.input.targetNodeUuid,
      sourceNodeLabels: ctx.input.sourceNodeLabels,
      targetNodeLabels: ctx.input.targetNodeLabels,
      sourceNodeAttributes: ctx.input.sourceNodeAttributes,
      targetNodeAttributes: ctx.input.targetNodeAttributes,
      edgeAttributes: ctx.input.edgeAttributes,
      userId: ctx.input.userId,
      graphId: ctx.input.graphId,
      createdAt: ctx.input.createdAt,
      validAt: ctx.input.validAt,
      invalidAt: ctx.input.invalidAt,
      expiredAt: ctx.input.expiredAt
    });

    return {
      output: {
        sourceNode: result.source_node
          ? {
              uuid: result.source_node.uuid,
              name: result.source_node.name,
              summary: result.source_node.summary,
              labels: result.source_node.labels
            }
          : null,
        targetNode: result.target_node
          ? {
              uuid: result.target_node.uuid,
              name: result.target_node.name,
              summary: result.target_node.summary,
              labels: result.target_node.labels
            }
          : null,
        edge: result.edge
          ? {
              uuid: result.edge.uuid,
              fact: result.edge.fact,
              name: result.edge.name
            }
          : null,
        taskId: result.task_id
      },
      message: `Added fact: **${ctx.input.fact}** (${ctx.input.factName}).`
    };
  })
  .build();
