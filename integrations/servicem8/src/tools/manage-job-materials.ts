import { SlateTool } from 'slates';
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
  description: `List, add, update, or remove materials (line items) on a job. Use **action** to specify the operation: \`list\` returns all materials for a job, \`add\` creates a new line item, \`update\` modifies an existing one, and \`remove\` deletes it.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'update', 'remove']).describe('Operation to perform'),
      jobUuid: z.string().optional().describe('UUID of the job (required for list and add)'),
      jobMaterialUuid: z
        .string()
        .optional()
        .describe('UUID of the job material (required for update and remove)'),
      materialUuid: z
        .string()
        .optional()
        .describe('UUID of the material from catalog (for add)'),
      name: z.string().optional().describe('Material name (for add/update)'),
      description: z.string().optional().describe('Material description (for add/update)'),
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
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let filter = ctx.input.jobUuid ? `job_uuid eq '${ctx.input.jobUuid}'` : undefined;
      let materials = await client.listJobMaterials({ filter });
      let mapped = materials.map((m: any) => ({
        jobMaterialUuid: m.uuid,
        jobUuid: m.job_uuid,
        materialUuid: m.material_uuid,
        name: m.name,
        description: m.description,
        quantity: m.quantity,
        unitPrice: m.unit_price,
        totalPrice: m.total_price,
        active: m.active
      }));
      return {
        output: { materials: mapped },
        message: `Found **${mapped.length}** material line item(s) on the job.`
      };
    }

    if (action === 'add') {
      let data: Record<string, any> = {};
      if (ctx.input.jobUuid) data.job_uuid = ctx.input.jobUuid;
      if (ctx.input.materialUuid) data.material_uuid = ctx.input.materialUuid;
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.quantity) data.quantity = ctx.input.quantity;
      if (ctx.input.unitPrice) data.unit_price = ctx.input.unitPrice;

      let jobMaterialUuid = await client.createJobMaterial(data);
      return {
        output: { jobMaterialUuid },
        message: `Added material **${ctx.input.name || jobMaterialUuid}** to job.`
      };
    }

    if (action === 'update') {
      let data: Record<string, any> = {};
      if (ctx.input.name !== undefined) data.name = ctx.input.name;
      if (ctx.input.description !== undefined) data.description = ctx.input.description;
      if (ctx.input.quantity !== undefined) data.quantity = ctx.input.quantity;
      if (ctx.input.unitPrice !== undefined) data.unit_price = ctx.input.unitPrice;

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
