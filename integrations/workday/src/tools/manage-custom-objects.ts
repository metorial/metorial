import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomObjects = SlateTool.create(spec, {
  name: 'List Custom Objects',
  key: 'list_custom_objects',
  description: `List worker-scoped multi-instance records of a tenant-defined custom object type. Pagination slices a verified complete native collection locally. Custom objects extend Workday's data model for organization-specific needs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectName: z
        .string()
        .describe('Web-service alias from the tenant View Custom Object task'),
      workerId: z
        .string()
        .optional()
        .describe(
          'Extended worker ID from list_workers; required at runtime because tenant-wide listing is unsupported'
        ),
      limit: z.number().optional().describe('Maximum number of results (default: 20)'),
      offset: z.number().optional().describe('Pagination offset (default: 0)')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('List of custom object records'),
      total: z.number().describe('Total number of records')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx.auth, ctx.config);

    let result = await client.listCustomObjects(ctx.input.objectName, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      workerId: ctx.input.workerId
    });

    return {
      output: { records: result.data, total: result.total },
      message: `Retrieved **${result.total}** records of custom object "${ctx.input.objectName}". Returned ${result.data.length} results.`
    };
  })
  .build();

export let getCustomObject = SlateTool.create(spec, {
  name: 'Get Custom Object',
  key: 'get_custom_object',
  description: `Retrieve a specific custom object record by its type and ID. Returns all fields of the custom object record.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectName: z.string().describe('Name of the custom object type'),
      objectId: z.string().describe('ID of the custom object record')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The custom object record')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx.auth, ctx.config);

    let result = await client.getCustomObject(ctx.input.objectName, ctx.input.objectId);

    return {
      output: { record: result },
      message: `Retrieved custom object "${ctx.input.objectName}" with ID ${ctx.input.objectId}.`
    };
  })
  .build();

export let createCustomObject = SlateTool.create(spec, {
  name: 'Create Custom Object',
  key: 'create_custom_object',
  description: `Create a new custom object record in Workday. The record fields depend on the custom object definition configured in your tenant. Include the extended worker in fields.worker and a custom reference ID. Supply its exact compound objectId for readback; types without reference IDs cannot be created safely through this tool.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      objectName: z.string().describe('Name of the custom object type'),
      objectId: z
        .string()
        .optional()
        .describe(
          'Exact worker-WID;referenceAlias=value identity, required at runtime for receipt-only creation and readback'
        ),
      fields: z
        .record(z.string(), z.any())
        .describe('Field values for the new custom object record')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The created custom object record')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx.auth, ctx.config);

    let result = await client.createCustomObject(
      ctx.input.objectName,
      ctx.input.fields,
      ctx.input.objectId
    );

    return {
      output: { record: result },
      message: `Created new custom object record of type "${ctx.input.objectName}".`
    };
  })
  .build();

export let updateCustomObject = SlateTool.create(spec, {
  name: 'Update Custom Object',
  key: 'update_custom_object',
  description: `Update an existing custom object record in Workday. The documented PUT accepts the fields to update. Worker binding and custom reference identity cannot be changed; the result is read back before success is returned.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      objectName: z.string().describe('Name of the custom object type'),
      objectId: z.string().describe('ID of the custom object record to update'),
      fields: z
        .record(z.string(), z.any())
        .describe('Field values to update on the custom object record')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The updated custom object record')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx.auth, ctx.config);

    let result = await client.updateCustomObject(
      ctx.input.objectName,
      ctx.input.objectId,
      ctx.input.fields
    );

    return {
      output: { record: result },
      message: `Updated custom object "${ctx.input.objectName}" with ID ${ctx.input.objectId}.`
    };
  })
  .build();

export let deleteCustomObject = SlateTool.create(spec, {
  name: 'Delete Custom Object',
  key: 'delete_custom_object',
  description: `Delete a custom object record from Workday. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      objectName: z.string().describe('Name of the custom object type'),
      objectId: z.string().describe('ID of the custom object record to delete')
    })
  )
  .output(
    z.object({
      objectName: z.string().describe('Name of the deleted custom object type'),
      objectId: z.string().describe('ID of the deleted record'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx.auth, ctx.config);

    await client.deleteCustomObject(ctx.input.objectName, ctx.input.objectId);

    return {
      output: {
        objectName: ctx.input.objectName,
        objectId: ctx.input.objectId,
        deleted: true
      },
      message: `Deleted custom object "${ctx.input.objectName}" with ID ${ctx.input.objectId}.`
    };
  })
  .build();
