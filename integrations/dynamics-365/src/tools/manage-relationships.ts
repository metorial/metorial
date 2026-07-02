import { SlateTool } from 'slates';
import { z } from 'zod';
import { DynamicsClient } from '../lib/client';
import { resolveDynamicsInstanceUrl } from '../lib/resolve-instance-url';
import { spec } from '../spec';

export let associateRecords = SlateTool.create(spec, {
  name: 'Associate Records',
  key: 'associate_records',
  description: `Create an association (relationship) between two existing Dynamics 365 records using a navigation property. Used for linking records through many-to-one, one-to-many, or many-to-many relationships.`,
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
      recordId: z.string().describe('GUID of the source record'),
      navigationProperty: z
        .string()
        .describe('Navigation property name representing the relationship'),
      targetEntitySetName: z.string().describe('Target entity set name (e.g., "contacts")'),
      targetRecordId: z.string().describe('GUID of the target record to associate')
    })
  )
  .output(
    z.object({
      associated: z.boolean().describe('Whether the association was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    await client.associateRecords(
      ctx.input.entitySetName,
      ctx.input.recordId,
      ctx.input.navigationProperty,
      ctx.input.targetEntitySetName,
      ctx.input.targetRecordId
    );

    return {
      output: { associated: true },
      message: `Associated **${ctx.input.entitySetName}(${ctx.input.recordId})** with **${ctx.input.targetEntitySetName}(${ctx.input.targetRecordId})** via *${ctx.input.navigationProperty}*.`
    };
  })
  .build();

export let disassociateRecords = SlateTool.create(spec, {
  name: 'Disassociate Records',
  key: 'disassociate_records',
  description: `Remove an association (relationship) between two Dynamics 365 records. For collection-valued navigation properties, specify the target record ID. For single-valued navigation properties, omit the target record ID to clear the lookup.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      entitySetName: z.string().describe('Source entity set name'),
      recordId: z.string().describe('GUID of the source record'),
      navigationProperty: z
        .string()
        .describe('Navigation property name representing the relationship'),
      targetRecordId: z
        .string()
        .optional()
        .describe(
          'GUID of the target record to disassociate (required for collection-valued navigation properties)'
        )
    })
  )
  .output(
    z.object({
      disassociated: z.boolean().describe('Whether the disassociation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    await client.disassociateRecords(
      ctx.input.entitySetName,
      ctx.input.recordId,
      ctx.input.navigationProperty,
      ctx.input.targetRecordId
    );

    return {
      output: { disassociated: true },
      message: `Removed association on **${ctx.input.entitySetName}(${ctx.input.recordId})** via *${ctx.input.navigationProperty}*.`
    };
  })
  .build();

export let getRelatedRecords = SlateTool.create(spec, {
  name: 'Get Related Records',
  key: 'get_related_records',
  description: `Retrieve records related to a specific Dynamics 365 record through a navigation property. Useful for fetching all contacts for an account, all activities for a lead, etc.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entitySetName: z.string().describe('Entity set name of the parent record'),
      recordId: z.string().describe('GUID of the parent record'),
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
      records: z.array(z.record(z.string(), z.any())).describe('Related records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DynamicsClient({
      token: ctx.auth.token,
      instanceUrl: resolveDynamicsInstanceUrl(ctx)
    });

    let records = await client.getRelatedRecords(
      ctx.input.entitySetName,
      ctx.input.recordId,
      ctx.input.navigationProperty,
      {
        select: ctx.input.select,
        filter: ctx.input.filter,
        top: ctx.input.top
      }
    );

    return {
      output: { records },
      message: `Retrieved **${records.length}** related records via *${ctx.input.navigationProperty}* from **${ctx.input.entitySetName}(${ctx.input.recordId})**.`
    };
  })
  .build();
