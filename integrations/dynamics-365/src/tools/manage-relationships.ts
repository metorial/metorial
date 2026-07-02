import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createDynamicsClient,
  dataverseAlternateKeySchema,
  recordKeyFromInput
} from '../lib/client';
import { spec } from '../spec';

export let associateRecords = SlateTool.create(spec, {
  name: 'Associate Records',
  key: 'associate_records',
  description: `Create an association (relationship) between two existing Dynamics 365 Dataverse records using a navigation property. Supports single-valued lookup and collection-valued relationships.`,
  instructions: [
    'The navigationProperty must be a valid navigation property on the source entity, e.g., "contact_customer_accounts" for the many-to-many between contacts and accounts.',
    'Use the OData entity set name (plural) for both source and target entities.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      entitySetName: z.string().describe('Source entity set name (e.g., "accounts")'),
      recordId: z.string().optional().describe('GUID of the source record'),
      alternateKey: dataverseAlternateKeySchema
        .optional()
        .describe('Alternate key values for the source record when recordId is omitted'),
      navigationProperty: z
        .string()
        .describe('Navigation property name representing the relationship'),
      targetEntitySetName: z.string().describe('Target entity set name (e.g., "contacts")'),
      targetRecordId: z.string().optional().describe('GUID of the target record to associate'),
      targetAlternateKey: dataverseAlternateKeySchema
        .optional()
        .describe('Alternate key values for the target record when targetRecordId is omitted'),
      relationshipType: z
        .enum(['single', 'collection'])
        .optional()
        .describe(
          'Use single for lookup navigation properties and collection for one-to-many or many-to-many relationships'
        )
    })
  )
  .output(
    z.object({
      entitySetName: z.string().describe('Source entity set name'),
      recordId: z.string().optional().describe('Source GUID when supplied'),
      targetEntitySetName: z.string().describe('Target entity set name'),
      targetRecordId: z.string().optional().describe('Target GUID when supplied'),
      navigationProperty: z.string().describe('Navigation property used'),
      relationshipType: z.enum(['single', 'collection']).describe('Relationship variant used'),
      associated: z.boolean().describe('Whether the association was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);
    let relationshipType = ctx.input.relationshipType ?? 'collection';

    await client.associateRecord({
      sourceEntitySetName: ctx.input.entitySetName,
      sourceRecordKey: recordKeyFromInput({
        recordId: ctx.input.recordId,
        alternateKey: ctx.input.alternateKey
      }),
      navigationProperty: ctx.input.navigationProperty,
      targetEntitySetName: ctx.input.targetEntitySetName,
      targetRecordKey: recordKeyFromInput({
        recordId: ctx.input.targetRecordId,
        alternateKey: ctx.input.targetAlternateKey
      }),
      relationshipType
    });

    return {
      output: {
        entitySetName: ctx.input.entitySetName,
        recordId: ctx.input.recordId,
        targetEntitySetName: ctx.input.targetEntitySetName,
        targetRecordId: ctx.input.targetRecordId,
        navigationProperty: ctx.input.navigationProperty,
        relationshipType,
        associated: true
      },
      message: `Associated **${ctx.input.entitySetName}** with **${ctx.input.targetEntitySetName}** via *${ctx.input.navigationProperty}*.`
    };
  })
  .build();

export let disassociateRecords = SlateTool.create(spec, {
  name: 'Disassociate Records',
  key: 'disassociate_records',
  description: `Remove an association (relationship) between two Dynamics 365 Dataverse records. For collection-valued navigation properties, specify the target record. For single-valued navigation properties, omit the target record to clear the lookup.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      entitySetName: z.string().describe('Source entity set name'),
      recordId: z.string().optional().describe('GUID of the source record'),
      alternateKey: dataverseAlternateKeySchema
        .optional()
        .describe('Alternate key values for the source record when recordId is omitted'),
      navigationProperty: z
        .string()
        .describe('Navigation property name representing the relationship'),
      targetRecordId: z
        .string()
        .optional()
        .describe(
          'GUID of the target record to disassociate (required for collection-valued navigation properties)'
        ),
      targetAlternateKey: dataverseAlternateKeySchema
        .optional()
        .describe('Alternate key values for the target record when targetRecordId is omitted'),
      relationshipType: z
        .enum(['single', 'collection'])
        .optional()
        .describe(
          'Use single to clear a lookup; use collection to remove a related collection item'
        )
    })
  )
  .output(
    z.object({
      entitySetName: z.string().describe('Source entity set name'),
      recordId: z.string().optional().describe('Source GUID when supplied'),
      targetRecordId: z.string().optional().describe('Target GUID when supplied'),
      navigationProperty: z.string().describe('Navigation property used'),
      relationshipType: z.enum(['single', 'collection']).describe('Relationship variant used'),
      disassociated: z.boolean().describe('Whether the disassociation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);
    let hasTarget = Boolean(ctx.input.targetRecordId || ctx.input.targetAlternateKey);
    let relationshipType = ctx.input.relationshipType ?? (hasTarget ? 'collection' : 'single');

    await client.disassociateRecord({
      sourceEntitySetName: ctx.input.entitySetName,
      sourceRecordKey: recordKeyFromInput({
        recordId: ctx.input.recordId,
        alternateKey: ctx.input.alternateKey
      }),
      navigationProperty: ctx.input.navigationProperty,
      relationshipType,
      targetRecordKey: hasTarget
        ? recordKeyFromInput({
            recordId: ctx.input.targetRecordId,
            alternateKey: ctx.input.targetAlternateKey
          })
        : undefined
    });

    return {
      output: {
        entitySetName: ctx.input.entitySetName,
        recordId: ctx.input.recordId,
        targetRecordId: ctx.input.targetRecordId,
        navigationProperty: ctx.input.navigationProperty,
        relationshipType,
        disassociated: true
      },
      message: `Removed association on **${ctx.input.entitySetName}** via *${ctx.input.navigationProperty}*.`
    };
  })
  .build();

export let getRelatedRecords = SlateTool.create(spec, {
  name: 'Get Related Records',
  key: 'get_related_records',
  description: `Retrieve records related to a specific Dynamics 365 Dataverse record through a navigation property. Useful for fetching contacts for an account, activities for a lead, or related custom table rows.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entitySetName: z.string().describe('Entity set name of the parent record'),
      recordId: z.string().optional().describe('GUID of the parent record'),
      alternateKey: dataverseAlternateKeySchema
        .optional()
        .describe('Alternate key values for the parent record when recordId is omitted'),
      navigationProperty: z
        .string()
        .describe('Navigation property to traverse (e.g., "contact_customer_accounts")'),
      select: z
        .array(z.string())
        .optional()
        .describe('Columns to return from the related records'),
      filter: z.string().optional().describe('OData filter to apply on related records'),
      top: z.number().optional().describe('Maximum number of related records to return')
    })
  )
  .output(
    z.object({
      entitySetName: z.string().describe('Parent entity set name'),
      recordId: z.string().optional().describe('Parent GUID when supplied'),
      navigationProperty: z.string().describe('Navigation property traversed'),
      records: z.array(z.record(z.string(), z.any())).describe('Related records'),
      nextLink: z
        .string()
        .nullable()
        .describe('Pagination URL for additional related records, or null')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);

    let result = await client.getRelatedRecords({
      entitySetName: ctx.input.entitySetName,
      recordKey: recordKeyFromInput({
        recordId: ctx.input.recordId,
        alternateKey: ctx.input.alternateKey
      }),
      navigationProperty: ctx.input.navigationProperty,
      query: {
        select: ctx.input.select,
        filter: ctx.input.filter,
        top: ctx.input.top
      }
    });

    return {
      output: {
        entitySetName: ctx.input.entitySetName,
        recordId: ctx.input.recordId,
        navigationProperty: ctx.input.navigationProperty,
        records: result.records,
        nextLink: result.nextLink
      },
      message: `Retrieved **${result.records.length}** related records via *${ctx.input.navigationProperty}* from **${ctx.input.entitySetName}**.`
    };
  })
  .build();
