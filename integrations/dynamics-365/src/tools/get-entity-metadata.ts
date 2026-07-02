import { SlateTool } from 'slates';
import { z } from 'zod';
import { DynamicsClient } from '../lib/client';
import { resolveDynamicsInstanceUrl } from '../lib/resolve-instance-url';
import { spec } from '../spec';

export let listEntities = SlateTool.create(spec, {
  name: 'List Entity Definitions',
  key: 'list_entities',
  description: `List all entity (table) definitions in the Dynamics 365 environment. Returns metadata about available entities including their logical names, display names, and entity set names. Useful for discovering which entities are available and their OData entity set names.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('OData $filter to narrow entities (e.g., "IsCustomEntity eq true")')
    })
  )
  .output(
    z.object({
      entities: z
        .array(
          z.object({
            logicalName: z.string().describe('Logical name of the entity'),
            displayName: z.string().describe('Display name of the entity'),
            entitySetName: z.string().describe('OData entity set name for API calls'),
            isCustomEntity: z.boolean().describe('Whether this is a custom entity'),
            description: z.string().describe('Entity description')
          })
        )
        .describe('List of entity definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    let entities = await client.getEntityDefinitions({
      select: ['LogicalName', 'DisplayName', 'EntitySetName', 'IsCustomEntity', 'Description'],
      filter: ctx.input.filter
    });

    let mapped = entities.map((e: any) => ({
      logicalName: e.LogicalName || '',
      displayName: e.DisplayName?.UserLocalizedLabel?.Label || e.LogicalName || '',
      entitySetName: e.EntitySetName || '',
      isCustomEntity: e.IsCustomEntity || false,
      description: e.Description?.UserLocalizedLabel?.Label || ''
    }));

    return {
      output: { entities: mapped },
      message: `Found **${mapped.length}** entity definitions.`
    };
  })
  .build();

export let getEntityAttributes = SlateTool.create(spec, {
  name: 'Get Entity Attributes',
  key: 'get_entity_attributes',
  description: `Retrieve all attribute (column) definitions for a specific Dynamics 365 entity. Returns field names, types, required levels, and whether they can be used in create/update operations. Essential for understanding the schema of an entity before creating or updating records.`,
  instructions: [
    'Use the entity logical name (singular, lowercase), not the entity set name. For example, use "account" not "accounts".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entityLogicalName: z
        .string()
        .describe('Logical name of the entity (e.g., "account", "contact", "lead")')
    })
  )
  .output(
    z.object({
      attributes: z
        .array(
          z.object({
            logicalName: z.string().describe('Logical name of the attribute'),
            displayName: z.string().describe('Display name of the attribute'),
            attributeType: z
              .string()
              .describe(
                'Data type of the attribute (e.g., String, Integer, DateTime, Lookup)'
              ),
            requiredLevel: z
              .string()
              .describe(
                'Whether the attribute is required (None, Recommended, ApplicationRequired, SystemRequired)'
              ),
            isValidForCreate: z
              .boolean()
              .describe('Whether the attribute can be set during creation'),
            isValidForUpdate: z
              .boolean()
              .describe('Whether the attribute can be modified during updates')
          })
        )
        .describe('List of attribute definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    let attributes = await client.getEntityAttributes(ctx.input.entityLogicalName);

    let mapped = attributes.map((a: any) => ({
      logicalName: a.LogicalName || '',
      displayName: a.DisplayName?.UserLocalizedLabel?.Label || a.LogicalName || '',
      attributeType: a.AttributeType || '',
      requiredLevel: a.RequiredLevel?.Value || 'None',
      isValidForCreate: a.IsValidForCreate ?? false,
      isValidForUpdate: a.IsValidForUpdate ?? false
    }));

    return {
      output: { attributes: mapped },
      message: `Found **${mapped.length}** attributes for entity **${ctx.input.entityLogicalName}**.`
    };
  })
  .build();
