import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RunPodClient } from '../lib/client';
import { spec } from '../spec';

export let manageTemplate = SlateTool.create(spec, {
  name: 'Manage Template',
  key: 'manage_template',
  description: `Update or delete a template. Templates supply their configuration when a Pod or endpoint is created; existing deployments are not updated. Existing deployments retain their resolved configuration after template deletion.`,
  constraints: [
    'Updating a template does not change existing Pods or endpoints.',
    'Deleting a template removes it from future deployment choices. Existing deployments retain their resolved configuration.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template'),
      action: z.enum(['update', 'delete']).describe('Action to perform'),
      name: z.string().optional().describe('Updated name (for update)'),
      imageName: z.string().optional().describe('Updated container image (for update)'),
      category: z
        .enum(['NVIDIA', 'AMD', 'CPU'])
        .optional()
        .describe('Updated category (for update)'),
      containerDiskInGb: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(1)
        .optional()
        .describe('Updated container disk (for update)'),
      volumeInGb: z
        .number()
        .refine(Number.isInteger, 'Must be an integer.')
        .min(10)
        .optional()
        .describe('Updated volume size (for update)'),
      volumeMountPath: z.string().optional().describe('Updated mount path (for update)'),
      env: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated environment variables (for update)'),
      ports: z.array(z.string()).optional().describe('Updated ports (for update)'),
      dockerEntrypoint: z
        .array(z.string())
        .optional()
        .describe('Updated ENTRYPOINT (for update)'),
      dockerStartCmd: z.array(z.string()).optional().describe('Updated CMD (for update)'),
      isPublic: z.boolean().optional().describe('Updated public flag (for update)'),
      isServerless: z.boolean().optional().describe('Updated serverless flag (for update)'),
      readme: z
        .string()
        .optional()
        .describe(
          'Retained for compatibility. The current REST API does not support readme; omit this field.'
        ),
      containerRegistryAuthId: z
        .string()
        .optional()
        .describe('Updated registry credentials (for update)')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('ID of the affected template'),
      action: z.string().describe('Action performed'),
      name: z.string().nullable().describe('Template name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RunPodClient({ token: ctx.auth.token });
    let { templateId, action, ...rest } = ctx.input;

    if (action === 'delete') {
      if (Object.values(rest).some(value => value !== undefined))
        throw createApiServiceError('Template update fields are not supported for delete.');
      await client.deleteTemplate(templateId);
      return {
        output: { templateId, action: 'delete', name: null },
        message: `Deleted template **${templateId}**.`
      };
    }

    let updateData: any = {};
    for (let [key, val] of Object.entries(rest)) {
      if (val !== undefined) updateData[key] = val;
    }

    let t = await client.updateTemplate(templateId, updateData);

    return {
      output: {
        templateId: t.id,
        action: 'update',
        name: t.name ?? null
      },
      message: `Updated template **${t.name ?? templateId}**.`
    };
  })
  .build();
