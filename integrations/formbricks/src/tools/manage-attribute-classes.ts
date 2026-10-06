import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let listAttributeClasses = SlateTool.create(spec, {
  name: 'List Attribute Classes',
  key: 'list_attribute_classes',
  instructions: [
    'Use list_contact_attribute_keys for current native key discovery. Attribute-definition writes require the provider UI.'
  ],
  description: `DEPRECATED — use list_contact_attribute_keys for native discovery. List all attribute classes in the environment. Attribute classes define custom properties on contacts used for segmentation and targeting.`,
  tags: {
    readOnly: true,
    deprecated: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      attributeClasses: z.array(
        z.object({
          attributeClassId: z.string().describe('Unique attribute class identifier'),
          name: z.string().describe('Attribute class name'),
          type: z.string().optional().describe('Attribute class type'),
          description: z.string().optional().describe('Attribute class description'),
          environmentId: z.string().optional().describe('Environment ID'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'Historical attribute-class routes are not supported by the current Formbricks v1 API. Use list_contact_attribute_keys to discover native keys; manage attribute definitions in the provider UI.',
      { reason: 'unsupported_legacy_api' }
    );
  })
  .build();

export let createAttributeClass = SlateTool.create(spec, {
  name: 'Create Attribute Class',
  key: 'create_attribute_class',
  instructions: [
    'Use list_contact_attribute_keys for discovery and the provider UI for definition changes.'
  ],
  tags: { deprecated: true },
  description: `DEPRECATED — the historical route is absent from the current v1 API. Use the provider UI to manage contact attributes. Create a new attribute class to define a custom property on contacts. Attributes are used for segmentation and survey targeting.`
})
  .input(
    z.object({
      environmentId: z
        .string()
        .describe('ID of the environment to create the attribute class in'),
      name: z.string().describe('Name of the attribute class'),
      type: z.enum(['code', 'noCode', 'automatic']).describe('Type of attribute class'),
      description: z.string().optional().describe('Description of the attribute class')
    })
  )
  .output(
    z.object({
      attributeClassId: z.string().describe('ID of the created attribute class'),
      name: z.string().describe('Name of the created attribute class')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'Historical attribute-class routes are not supported by the current Formbricks v1 API. Use list_contact_attribute_keys to discover native keys; manage attribute definitions in the provider UI.',
      { reason: 'unsupported_legacy_api' }
    );
  })
  .build();

export let deleteAttributeClass = SlateTool.create(spec, {
  name: 'Delete Attribute Class',
  key: 'delete_attribute_class',
  instructions: [
    'Use list_contact_attribute_keys for discovery and the provider UI for definition changes.'
  ],
  description: `DEPRECATED — the historical route is absent from the current v1 API. Use the provider UI to manage contact attributes. Delete an attribute class. This removes the custom property definition from the environment.`,
  tags: {
    destructive: true,
    deprecated: true
  }
})
  .input(
    z.object({
      attributeClassId: z.string().describe('ID of the attribute class to delete')
    })
  )
  .output(
    z.object({
      attributeClassId: z.string().describe('ID of the deleted attribute class')
    })
  )
  .handleInvocation(async () => {
    throw createApiServiceError(
      'Historical attribute-class routes are not supported by the current Formbricks v1 API. Use list_contact_attribute_keys to discover native keys; manage attribute definitions in the provider UI.',
      { reason: 'unsupported_legacy_api' }
    );
  })
  .build();
