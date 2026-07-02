import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDataBreach = SlateTool.create(spec, {
  name: 'Manage Data Breach',
  key: 'manage_data_breach',
  description: `Create, retrieve, update, list, or delete data breach evaluation records. Also supports evaluating breach impact for compliance and risk management. Use this for all data breach lifecycle operations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete', 'evaluate'])
        .describe('Action to perform'),
      breachId: z.string().optional().describe('Breach ID (required for get, update, delete)'),
      name: z.string().optional().describe('Name of the breach'),
      description: z.string().optional().describe('Description of the breach'),
      status: z.string().optional().describe('Status of the breach'),
      severity: z.string().optional().describe('Severity level'),
      breachDate: z.string().optional().describe('Date when the breach occurred (ISO 8601)'),
      discoveryDate: z
        .string()
        .optional()
        .describe('Date when the breach was discovered (ISO 8601)'),
      notificationDate: z
        .string()
        .optional()
        .describe('Date authorities/subjects were notified (ISO 8601)'),
      affectedDataSubjects: z.number().optional().describe('Number of affected data subjects'),
      affectedDataTypes: z.array(z.string()).optional().describe('Types of data affected'),
      breachType: z.string().optional().describe('Type of breach'),
      isDraft: z
        .boolean()
        .optional()
        .describe('Save evaluation as draft (for evaluate action)'),
      page: z.number().optional().describe('Page number for listing'),
      size: z.number().optional().describe('Page size for listing'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z
      .object({
        breach: z.any().optional().describe('Breach record details'),
        breaches: z.array(z.any()).optional().describe('List of breach records'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, breachId } = ctx.input;

    switch (action) {
      case 'create': {
        let result = await client.createDataBreach({
          name: ctx.input.name,
          description: ctx.input.description,
          status: ctx.input.status,
          severity: ctx.input.severity,
          breachDate: ctx.input.breachDate,
          discoveryDate: ctx.input.discoveryDate,
          notificationDate: ctx.input.notificationDate,
          affectedDataSubjects: ctx.input.affectedDataSubjects,
          affectedDataTypes: ctx.input.affectedDataTypes,
          breachType: ctx.input.breachType
        });
        let data = result?.data ?? result;
        return {
          output: { breach: data, success: true },
          message: `Data breach record created${data?.id ? ` with ID **${data.id}**` : ''}.`
        };
      }
      case 'get': {
        if (!breachId) throw new Error('breachId is required for get action');
        let result = await client.getDataBreach(breachId);
        let data = result?.data ?? result;
        return {
          output: { breach: data, success: true },
          message: `Retrieved data breach **${breachId}**.`
        };
      }
      case 'list': {
        let result = await client.listDataBreaches({
          page: ctx.input.page,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder,
          status: ctx.input.status
        });
        let data = result?.data ?? result;
        let breaches = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
        return {
          output: { breaches, success: true },
          message: `Found **${breaches.length}** data breach record(s).`
        };
      }
      case 'update': {
        if (!breachId) throw new Error('breachId is required for update action');
        let updatePayload: Record<string, any> = {};
        if (ctx.input.name !== undefined) updatePayload.name = ctx.input.name;
        if (ctx.input.description !== undefined)
          updatePayload.description = ctx.input.description;
        if (ctx.input.status !== undefined) updatePayload.status = ctx.input.status;
        if (ctx.input.severity !== undefined) updatePayload.severity = ctx.input.severity;
        if (ctx.input.breachDate !== undefined)
          updatePayload.breachDate = ctx.input.breachDate;
        if (ctx.input.discoveryDate !== undefined)
          updatePayload.discoveryDate = ctx.input.discoveryDate;
        if (ctx.input.notificationDate !== undefined)
          updatePayload.notificationDate = ctx.input.notificationDate;
        if (ctx.input.affectedDataSubjects !== undefined)
          updatePayload.affectedDataSubjects = ctx.input.affectedDataSubjects;
        if (ctx.input.affectedDataTypes !== undefined)
          updatePayload.affectedDataTypes = ctx.input.affectedDataTypes;
        if (ctx.input.breachType !== undefined)
          updatePayload.breachType = ctx.input.breachType;

        let result = await client.updateDataBreach(breachId, updatePayload);
        let data = result?.data ?? result;
        return {
          output: { breach: data, success: true },
          message: `Data breach **${breachId}** updated.`
        };
      }
      case 'delete': {
        if (!breachId) throw new Error('breachId is required for delete action');
        await client.deleteDataBreach(breachId);
        return {
          output: { success: true },
          message: `Data breach **${breachId}** deleted.`
        };
      }
      case 'evaluate': {
        let result = await client.evaluateDataBreachImpact({
          breachId: ctx.input.breachId,
          name: ctx.input.name,
          description: ctx.input.description,
          isDraft: ctx.input.isDraft
        });
        let data = result?.data ?? result;
        return {
          output: { breach: data, success: true },
          message: `Breach impact evaluation ${ctx.input.isDraft ? 'saved as draft' : 'completed'}.`
        };
      }
    }
  })
  .build();
