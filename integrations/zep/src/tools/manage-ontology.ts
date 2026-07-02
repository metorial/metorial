import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageOntology = SlateTool.create(spec, {
  name: 'Manage Ontology',
  key: 'manage_ontology',
  description: `Configure or retrieve custom entity types and edge types for knowledge graphs. Setting an ontology defines domain-specific graph structure that improves precision and relevance of agent memory. Can also list all currently configured entity and edge types.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['set', 'list'])
        .describe('"set" to configure ontology, "list" to retrieve current entity/edge types'),
      entities: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Entity type definitions keyed by type name (required for set)'),
      edges: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Edge type definitions keyed by type name with source/target constraints (required for set)'
        ),
      userIds: z
        .array(z.string())
        .optional()
        .describe(
          'Specific user IDs to apply ontology to (optional, empty applies project-wide)'
        ),
      graphIds: z
        .array(z.string())
        .optional()
        .describe('Specific graph IDs to apply ontology to')
    })
  )
  .output(
    z.object({
      entityTypes: z.array(z.unknown()).optional().describe('List of configured entity types'),
      edgeTypes: z.array(z.unknown()).optional().describe('List of configured edge types'),
      success: z.boolean().optional().describe('Whether the ontology was set successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'list') {
      let result = await client.getEntityTypes();
      return {
        output: {
          entityTypes: result.entity_types || [],
          edgeTypes: result.edge_types || []
        },
        message: `Retrieved **${(result.entity_types || []).length}** entity types and **${(result.edge_types || []).length}** edge types.`
      };
    }

    // set
    await client.setOntology({
      entities: ctx.input.entities,
      edges: ctx.input.edges,
      userIds: ctx.input.userIds,
      graphIds: ctx.input.graphIds
    });
    return {
      output: { success: true },
      message: `Ontology updated successfully.`
    };
  })
  .build();
