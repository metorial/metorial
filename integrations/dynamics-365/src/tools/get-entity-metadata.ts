import { SlateTool } from 'slates';
import { z } from 'zod';
import { createDynamicsClient } from '../lib/client';
import { spec } from '../spec';

export let listEntities = SlateTool.create(spec, {
  name: 'List Entity Definitions',
  key: 'list_entities',
  description: `List Dataverse table definitions in the Dynamics 365 environment. Returns metadata including logical names, display names, entity set names, primary columns, and ownership details.`,
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
            description: z.string().describe('Entity description'),
            primaryIdAttribute: z.string().optional().describe('Primary ID column'),
            primaryNameAttribute: z.string().optional().describe('Primary name column'),
            ownershipType: z.string().optional().describe('Dataverse ownership type'),
            isActivity: z.boolean().optional().describe('Whether the table is an activity'),
            metadataId: z.string().optional().describe('Dataverse metadata ID')
          })
        )
        .describe('List of entity definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);

    let entities = await client.getEntityDefinitions({
      select: [
        'LogicalName',
        'DisplayName',
        'EntitySetName',
        'IsCustomEntity',
        'Description',
        'PrimaryIdAttribute',
        'PrimaryNameAttribute',
        'OwnershipType',
        'IsActivity',
        'MetadataId'
      ],
      filter: ctx.input.filter
    });

    let mapped = entities.map((e: any) => ({
      logicalName: e.logicalName || '',
      displayName: e.displayName || e.logicalName || '',
      entitySetName: e.entitySetName || '',
      isCustomEntity: e.isCustomEntity ?? false,
      description: e.description || '',
      primaryIdAttribute: e.primaryIdAttribute,
      primaryNameAttribute: e.primaryNameAttribute,
      ownershipType: e.ownershipType,
      isActivity: e.isActivity,
      metadataId: e.metadataId
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
  description: `Retrieve attribute (column) definitions for a specific Dynamics 365 Dataverse table. Returns field names, types, required levels, read/create/update capabilities, lookup targets, and metadata IDs.`,
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
              .describe('Whether the attribute can be modified during updates'),
            isValidForRead: z
              .boolean()
              .optional()
              .describe('Whether the attribute can be read'),
            schemaName: z.string().optional().describe('Schema name of the attribute'),
            description: z.string().optional().describe('Attribute description'),
            targets: z.array(z.string()).optional().describe('Lookup target logical names'),
            attributeOf: z
              .string()
              .optional()
              .describe('Parent attribute for calculated fields'),
            metadataId: z.string().optional().describe('Dataverse metadata ID')
          })
        )
        .describe('List of attribute definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);

    let attributes = await client.getEntityAttributes(ctx.input.entityLogicalName);

    let mapped = attributes.map((a: any) => ({
      logicalName: a.logicalName || '',
      displayName: a.displayName || a.logicalName || '',
      attributeType: a.type || '',
      requiredLevel: a.requiredLevel || 'None',
      isValidForCreate: a.isValidForCreate ?? false,
      isValidForUpdate: a.isValidForUpdate ?? false,
      isValidForRead: a.isValidForRead,
      schemaName: a.schemaName,
      description: a.description,
      targets: a.targets,
      attributeOf: a.attributeOf,
      metadataId: a.metadataId
    }));

    return {
      output: { attributes: mapped },
      message: `Found **${mapped.length}** attributes for entity **${ctx.input.entityLogicalName}**.`
    };
  })
  .build();
