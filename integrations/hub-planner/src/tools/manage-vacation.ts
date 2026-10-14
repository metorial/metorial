import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageVacation = SlateTool.create(spec, {
  name: 'Manage Vacation',
  key: 'manage_vacation',
  description: `Create, update, or delete vacation/time-off records for resources in Hub Planner.
When creating, **resourceId**, **start**, **end**, and **type** are required.`,
  constraints: ['Requires the Vacation extension to be enabled on the account.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      vacationId: z
        .string()
        .optional()
        .describe('Vacation ID, required for update and delete'),
      resourceId: z.string().optional().describe('Resource ID, required for create'),
      start: z.string().optional().describe('Start date (YYYY-MM-DD), required for create'),
      end: z.string().optional().describe('End date (YYYY-MM-DD), required for create'),
      type: z
        .string()
        .optional()
        .describe(
          'Vacation type, required for create. APPROVED and REJECTED require approvalInfo.'
        ),
      approvalInfo: z
        .object({
          approvers: z
            .array(z.object({ id: z.string() }))
            .optional()
            .describe(
              'Company approver IDs, required when the resource has no default approvers'
            ),
          requesterNote: z.string().optional(),
          approverNote: z.string().optional(),
          approvedOrRejectedById: z
            .string()
            .optional()
            .describe('Approver resource ID, required for APPROVED or REJECTED'),
          approvedOrRejectedDate: z
            .string()
            .optional()
            .describe('Approval/rejection date, required for APPROVED or REJECTED')
        })
        .optional()
        .describe('Vacation approval details'),
      title: z.string().optional().describe('Vacation title'),
      percentAllocation: z.number().optional().describe('Percent allocation'),
      minutesPerDay: z.number().optional().describe('Minutes per day')
    })
  )
  .output(
    z.object({
      vacationId: z.string().optional().describe('Vacation ID'),
      resourceId: z.string().optional().describe('Resource ID'),
      start: z.string().optional().describe('Start date'),
      end: z.string().optional().describe('End date'),
      type: z.string().optional().describe('Vacation type'),
      title: z.string().optional().describe('Vacation title'),
      createdDate: z.string().optional().describe('Creation timestamp'),
      updatedDate: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, vacationId, resourceId, ...fields } = ctx.input;
    if (
      (action === 'create' || action === 'update') &&
      (fields.type === 'APPROVED' || fields.type === 'REJECTED') &&
      (!fields.approvalInfo?.approvedOrRejectedById?.trim() ||
        !fields.approvalInfo.approvedOrRejectedDate?.trim())
    ) {
      throw createApiServiceError(
        'APPROVED and REJECTED vacations require approvalInfo.approvedOrRejectedById and approvalInfo.approvedOrRejectedDate.'
      );
    }

    if (action === 'create') {
      if (
        !ctx.input.resourceId?.trim() ||
        !ctx.input.start?.trim() ||
        !ctx.input.end?.trim() ||
        !ctx.input.type?.trim()
      ) {
        throw createApiServiceError('resourceId, start, end, type are required for create.');
      }
      let body: Record<string, any> = { ...fields, resource: resourceId };
      let result = await client.createVacation(body);
      return {
        output: {
          vacationId: result._id,
          resourceId: result.resource ?? undefined,
          start: result.start ?? undefined,
          end: result.end ?? undefined,
          type: result.type ?? undefined,
          title: result.title ?? undefined,
          createdDate: result.createdDate ?? undefined,
          updatedDate: result.updatedDate ?? undefined
        },
        message: `Created vacation (ID: \`${result._id}\`) for resource \`${result.resource}\`.`
      };
    }

    if (action === 'update') {
      if (!vacationId) throw createApiServiceError('vacationId is required for update');
      let body: Record<string, any> = { ...fields };
      if (resourceId) body.resource = resourceId;
      let result = await client.updateVacation(vacationId, body);
      return {
        output: {
          vacationId: result._id,
          resourceId: result.resource ?? undefined,
          start: result.start ?? undefined,
          end: result.end ?? undefined,
          type: result.type ?? undefined,
          title: result.title ?? undefined,
          createdDate: result.createdDate ?? undefined,
          updatedDate: result.updatedDate ?? undefined
        },
        message: `Updated vacation \`${result._id}\`.`
      };
    }

    if (!vacationId) throw createApiServiceError('vacationId is required for delete');
    await client.deleteVacation(vacationId);
    return {
      output: { vacationId },
      message: `Deleted vacation \`${vacationId}\`.`
    };
  })
  .build();
