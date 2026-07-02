import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { requireWorkableString } from '../lib/errors';
import {
  buildRequisitionBody,
  compact,
  mapRequisition,
  resultArray,
  unwrapRequisition
} from '../lib/shapes';
import { spec } from '../spec';

let requisitionSchema = z.object({
  requisitionId: z.string().optional(),
  requisitionCode: z.string().optional(),
  jobTitle: z.string().optional(),
  state: z.string().optional(),
  jobId: z.string().optional(),
  jobShortcode: z.string().optional(),
  departmentId: z.union([z.string(), z.number()]).optional(),
  department: z.string().optional(),
  countryCode: z.string().optional(),
  city: z.string().optional(),
  location: z.string().optional(),
  requesterId: z.string().optional(),
  hiringManagerId: z.string().optional(),
  ownerId: z.string().optional(),
  planDate: z.string().optional(),
  startDate: z.string().optional(),
  salaryRange: z.any().optional(),
  employmentType: z.string().optional(),
  experience: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  candidateId: z.string().optional(),
  approvalGroups: z.any().optional(),
  requisitionAttributes: z.any().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let manageRequisitionTool = SlateTool.create(spec, {
  name: 'Manage Requisitions',
  key: 'manage_requisition',
  description: `List, get, create, update, approve, or reject Workable Hiring Plan requisitions using the documented code/id split: code for get/approve/reject and id for update.`,
  instructions: [
    'Use "list" to browse requisitions.',
    'Use "get" with requisitionCode.',
    'Use "create" with memberId, requisitionCode, ownerId, hiringManagerId, jobTitle, and planDate.',
    'Use "update" with requisitionId and memberId.',
    'Use "approve" or "reject" with requisitionCode and memberId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'approve', 'reject'])
        .describe('The action to perform'),
      requisitionCode: z
        .string()
        .optional()
        .describe('Requisition code required for get, approve, reject, and create'),
      requisitionId: z.string().optional().describe('Requisition ID required for update'),
      memberId: z
        .string()
        .optional()
        .describe('Member ID required for create, update, approve, and reject'),
      state: z.string().optional().describe('Filter by state when listing'),
      jobId: z.string().optional().describe('Filter by job ID when listing or set job ID'),
      planDateFrom: z.string().optional().describe('List filter: plan date from'),
      planDateTo: z.string().optional().describe('List filter: plan date to'),
      createdAfter: z.string().optional().describe('List filter: created after'),
      updatedAfter: z.string().optional().describe('List filter: updated after'),
      limit: z.number().optional().describe('Max results when listing'),
      sinceId: z.string().optional().describe('Return records with ID greater than this ID'),
      maxId: z.string().optional().describe('Return records with ID less than this ID'),
      ownerId: z.string().optional().describe('Owner member ID for create/update'),
      hiringManagerId: z.string().optional().describe('Hiring manager member ID'),
      jobTitle: z.string().optional().describe('Job title'),
      planDate: z.string().optional().describe('Planned requisition date'),
      departmentId: z.string().optional().describe('Department ID'),
      countryCode: z.string().optional().describe('Country code'),
      stateCode: z.string().optional().describe('State/region code'),
      city: z.string().optional().describe('City'),
      subregion: z.string().optional().describe('Subregion'),
      coords: z.string().optional().describe('Coordinates in Workable API shape'),
      location: z.string().optional().describe('Location string'),
      employmentType: z.string().optional().describe('Employment type'),
      experience: z.string().optional().describe('Experience level'),
      salaryFrom: z.number().optional().describe('Salary range lower bound'),
      salaryTo: z.number().optional().describe('Salary range upper bound'),
      salaryCurrency: z.string().optional().describe('Salary currency'),
      salaryFrequency: z.string().optional().describe('Salary frequency'),
      reason: z.string().optional().describe('Requisition reason'),
      notes: z.string().optional().describe('Requisition notes'),
      requisitionAttributes: z
        .array(z.any())
        .optional()
        .describe('Custom requisition attributes in Workable API shape'),
      rejectionReason: z.string().optional().describe('Reason for reject action')
    })
  )
  .output(
    z.object({
      requisitions: z.array(requisitionSchema).optional().describe('List of requisitions'),
      requisition: requisitionSchema.optional().describe('Single requisition details'),
      actionPerformed: z.string().describe('Description of action performed'),
      paging: z
        .object({
          next: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listRequisitions({
          state: ctx.input.state,
          job_id: ctx.input.jobId,
          plan_date_from: ctx.input.planDateFrom,
          plan_date_to: ctx.input.planDateTo,
          created_after: ctx.input.createdAfter,
          updated_after: ctx.input.updatedAfter,
          limit: ctx.input.limit,
          since_id: ctx.input.sinceId,
          max_id: ctx.input.maxId
        });
        let requisitions = resultArray(result, 'requisitions').map(mapRequisition);
        return {
          output: {
            requisitions,
            actionPerformed: 'Listed requisitions',
            paging: result.paging
          },
          message: `Found **${requisitions.length}** requisition(s).`
        };
      }
      case 'get': {
        let requisitionCode = requireWorkableString(
          ctx.input.requisitionCode,
          'requisitionCode',
          'get'
        );
        let result = await client.getRequisition(requisitionCode);
        let requisition = mapRequisition(unwrapRequisition(result as any));
        return {
          output: {
            requisition,
            actionPerformed: 'Retrieved requisition'
          },
          message: `Retrieved requisition **${requisition.requisitionCode || requisitionCode}**.`
        };
      }
      case 'create': {
        for (let [field, value] of Object.entries({
          memberId: ctx.input.memberId,
          requisitionCode: ctx.input.requisitionCode,
          ownerId: ctx.input.ownerId,
          hiringManagerId: ctx.input.hiringManagerId,
          jobTitle: ctx.input.jobTitle,
          planDate: ctx.input.planDate
        })) {
          if (!value) throw createApiServiceError(`${field} is required for create.`);
        }

        let result = await client.createRequisition(buildRequisitionBody(ctx.input));
        let requisition = mapRequisition(unwrapRequisition(result as any));
        return {
          output: {
            requisition,
            actionPerformed: 'Created requisition'
          },
          message: `Created requisition **${requisition.requisitionCode || ctx.input.requisitionCode}**.`
        };
      }
      case 'update': {
        let requisitionId = requireWorkableString(
          ctx.input.requisitionId,
          'requisitionId',
          'update'
        );
        requireWorkableString(ctx.input.memberId, 'memberId', 'update');
        let body = buildRequisitionBody(ctx.input);
        if (Object.keys(body).length <= 1) {
          throw createApiServiceError('Provide at least one requisition field for update.');
        }

        let result = await client.updateRequisition(requisitionId, body);
        let requisition = mapRequisition(unwrapRequisition(result as any));
        return {
          output: {
            requisition,
            actionPerformed: 'Updated requisition'
          },
          message: `Updated requisition **${requisitionId}**.`
        };
      }
      case 'approve': {
        let requisitionCode = requireWorkableString(
          ctx.input.requisitionCode,
          'requisitionCode',
          'approve'
        );
        let memberId = requireWorkableString(ctx.input.memberId, 'memberId', 'approve');
        let result = await client.approveRequisition(requisitionCode, {
          member_id: memberId
        });
        return {
          output: {
            requisition: mapRequisition(unwrapRequisition(result as any)),
            actionPerformed: `Approved requisition ${requisitionCode}`
          },
          message: `Approved requisition **${requisitionCode}**.`
        };
      }
      case 'reject': {
        let requisitionCode = requireWorkableString(
          ctx.input.requisitionCode,
          'requisitionCode',
          'reject'
        );
        let memberId = requireWorkableString(ctx.input.memberId, 'memberId', 'reject');
        let result = await client.rejectRequisition(
          requisitionCode,
          compact({
            member_id: memberId,
            rejection_reason: ctx.input.rejectionReason
          })
        );
        return {
          output: {
            requisition: mapRequisition(unwrapRequisition(result as any)),
            actionPerformed: `Rejected requisition ${requisitionCode}`
          },
          message: `Rejected requisition **${requisitionCode}**.`
        };
      }
    }
  })
  .build();
