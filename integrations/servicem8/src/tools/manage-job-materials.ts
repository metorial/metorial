import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let jobMaterialSchema = z.object({
  jobMaterialUuid: z.string().describe('UUID of the job material record'),
  jobUuid: z.string().optional().describe('UUID of the associated job'),
  materialUuid: z.string().optional().describe('UUID of the material from catalog'),
  name: z.string().optional().describe('Material name'),
  description: z.string().optional().describe('Material description'),
  quantity: z.string().optional().describe('Quantity'),
  unitPrice: z.string().optional().describe('Unit price'),
  totalPrice: z.string().optional().describe('Total price (quantity * unit price)'),
  active: z.number().optional().describe('1 = active, 0 = deleted')
});

export let manageJobMaterials = SlateTool.create(spec, {
  name: 'Manage Job Materials',
  key: 'manage_job_materials',
  description: `List, add, update, or remove job materials (line items). Use **action** to specify the operation: \`list\` returns materials for a job or across the account when jobUuid is omitted, \`add\` creates a new line item, \`update\` modifies an existing one, and \`remove\` deletes it.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'update', 'remove']).describe('Operation to perform'),
      jobUuid: z
        .string()
        .optional()
        .describe(
          'UUID of the job. Required for add; optional for list to filter one job. Omit for account-wide listing.'
        ),
      jobMaterialUuid: z
        .string()
        .optional()
        .describe('UUID of the job material (required for update and remove)'),
      materialUuid: z
        .string()
        .optional()
        .describe('UUID of the material from catalog (for add)'),
      name: z.string().optional().describe('Material name (for add/update)'),
      description: z
        .string()
        .optional()
        .describe('Unsupported by this endpoint; omit this field'),
      quantity: z.string().optional().describe('Quantity (for add/update)'),
      unitPrice: z.string().optional().describe('Unit price (for add/update)')
    })
  )
  .output(
    z.object({
      materials: z
        .array(jobMaterialSchema)
        .optional()
        .describe('List of job materials (for list action)'),
      jobMaterialUuid: z
        .string()
        .optional()
        .describe('UUID of the created/updated/removed material')
    })
  )
  .handleInvocation(async ctx => {
    let { action } = ctx.input;
    if (action === 'add' && !ctx.input.jobUuid) {
      throw createApiServiceError('Provide jobUuid for add. Call list_jobs to discover jobs.');
    }
    if ((action === 'update' || action === 'remove') && !ctx.input.jobMaterialUuid) {
      throw createApiServiceError(
        'Provide jobMaterialUuid for update or remove. Use the list action to discover line items.'
      );
    }
    if (action === 'add' && !ctx.input.quantity) {
      throw createApiServiceError('Provide quantity when adding a job material.');
    }
    if (ctx.input.description !== undefined) {
      throw createApiServiceError(
        'ServiceM8 job materials do not support a separate description. Omit description and provide the invoice text as name.'
      );
    }
    let client = new Client(ctx.auth);

    if (action === 'list') {
      let filter = ctx.input.jobUuid ? `job_uuid eq '${ctx.input.jobUuid}'` : undefined;
      let materials = await client.listJobMaterials({ filter });
      let mapped = materials.map((m: any) => ({
        jobMaterialUuid: m.uuid,
        jobUuid: m.job_uuid,
        materialUuid: m.material_uuid,
        name: m.name,
        quantity: m.quantity,
        unitPrice: m.price,
        active: m.active
      }));
      return {
        output: { materials: mapped },
        message: `Found **${mapped.length}** material line item(s) ${ctx.input.jobUuid ? 'on the job' : 'across the account'}.`
      };
    }

    if (action === 'add') {
      let data: Record<string, any> = {};
      if (ctx.input.jobUuid) data.job_uuid = ctx.input.jobUuid;
      if (ctx.input.materialUuid) data.material_uuid = ctx.input.materialUuid;
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.quantity) data.quantity = ctx.input.quantity;
      if (ctx.input.unitPrice !== undefined) data.price = ctx.input.unitPrice;

      let jobMaterialUuid = await client.createJobMaterial(data);
      return {
        output: { jobMaterialUuid },
        message: `Added material **${ctx.input.name || jobMaterialUuid}** to job.`
      };
    }

    if (action === 'update') {
      let data: Record<string, any> = {};
      if (ctx.input.name !== undefined) data.name = ctx.input.name;
      if (ctx.input.quantity !== undefined) data.quantity = ctx.input.quantity;
      if (ctx.input.unitPrice !== undefined) data.price = ctx.input.unitPrice;

      await client.updateJobMaterial(ctx.input.jobMaterialUuid!, data);
      return {
        output: { jobMaterialUuid: ctx.input.jobMaterialUuid },
        message: `Updated material **${ctx.input.jobMaterialUuid}**.`
      };
    }

    if (action === 'remove') {
      await client.deleteJobMaterial(ctx.input.jobMaterialUuid!);
      return {
        output: { jobMaterialUuid: ctx.input.jobMaterialUuid },
        message: `Removed material **${ctx.input.jobMaterialUuid}** from job.`
      };
    }

    return {
      output: {},
      message: 'No action performed.'
    };
  })
  .build();
