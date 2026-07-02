import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDpia = SlateTool.create(spec, {
  name: 'Manage DPIA',
  key: 'manage_dpia',
  description: `Create, retrieve, update, or delete Data Protection Impact Assessments (DPIAs) for processing activities. Includes comprehensive risk assessments for confidentiality, integrity, and availability compliance.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Action to perform'),
      dpiaId: z.string().optional().describe('DPIA ID (required for get, update, delete)'),
      processingActivityId: z
        .string()
        .optional()
        .describe('Processing activity ID (required for create)'),
      status: z.string().optional().describe('DPIA status'),
      confidentialityRisk: z
        .string()
        .optional()
        .describe('Confidentiality risk assessment level'),
      integrityRisk: z.string().optional().describe('Integrity risk assessment level'),
      availabilityRisk: z.string().optional().describe('Availability risk assessment level')
    })
  )
  .output(
    z
      .object({
        dpia: z.any().optional().describe('DPIA record'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, dpiaId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.processingActivityId || !ctx.input.status) {
          throw new Error('processingActivityId and status are required for creating a DPIA');
        }
        let result = await client.createDpia({
          processingActivityId: ctx.input.processingActivityId,
          status: ctx.input.status,
          confidentialityRisk: ctx.input.confidentialityRisk,
          integrityRisk: ctx.input.integrityRisk,
          availabilityRisk: ctx.input.availabilityRisk
        });
        let data = result?.data ?? result;
        return {
          output: { dpia: data, success: true },
          message: `DPIA created for processing activity **${ctx.input.processingActivityId}**.`
        };
      }
      case 'get': {
        if (!dpiaId) throw new Error('dpiaId is required for get action');
        let result = await client.getDpia(dpiaId);
        let data = result?.data ?? result;
        return {
          output: { dpia: data, success: true },
          message: `Retrieved DPIA **${dpiaId}**.`
        };
      }
      case 'update': {
        if (!dpiaId) throw new Error('dpiaId is required for update action');
        let updatePayload: Record<string, any> = {};
        if (ctx.input.status !== undefined) updatePayload.status = ctx.input.status;
        if (ctx.input.confidentialityRisk !== undefined)
          updatePayload.confidentialityRisk = ctx.input.confidentialityRisk;
        if (ctx.input.integrityRisk !== undefined)
          updatePayload.integrityRisk = ctx.input.integrityRisk;
        if (ctx.input.availabilityRisk !== undefined)
          updatePayload.availabilityRisk = ctx.input.availabilityRisk;

        let result = await client.updateDpia(dpiaId, updatePayload);
        let data = result?.data ?? result;
        return {
          output: { dpia: data, success: true },
          message: `DPIA **${dpiaId}** updated.`
        };
      }
      case 'delete': {
        if (!dpiaId) throw new Error('dpiaId is required for delete action');
        await client.deleteDpia(dpiaId);
        return {
          output: { success: true },
          message: `DPIA **${dpiaId}** deleted.`
        };
      }
    }
  })
  .build();
