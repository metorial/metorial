import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  optionalBoolean,
  optionalNumber,
  optionalString,
  optionalStrings,
  requiredString,
  requireRecord,
  requireRecords
} from '../lib/response';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getProjectDetails = SlateTool.create(spec, {
  name: 'Get Extended Project Details',
  key: 'get_project_details',
  description:
    'Retrieve extended project settings, labels, members, and custom status definitions. Use returned status IDs when creating or updating tasks. Call list_projects to discover projects.',
  tags: { readOnly: true }
})
  .input(z.object({ projectId: projectIdSchema }))
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      workspaceId: z.string().optional().describe('Workspace ID'),
      description: z.string().nullable().optional().describe('Project description'),
      customerId: z.string().optional().describe('Associated customer ID'),
      startDate: z.string().optional().describe('Project start date'),
      createdAt: z.string().optional().describe('Provider project creation timestamp'),
      updatedAt: z.string().optional().describe('Provider project update timestamp'),
      milestoneEnabled: z.boolean().optional().describe('Whether milestones are enabled'),
      estimateEnabled: z.boolean().optional().describe('Whether time estimates are enabled'),
      projectUsers: z.array(z.string()).optional().describe('Project member IDs'),
      statuses: z
        .array(
          z.object({
            statusId: z.string().describe('Custom status ID usable as statusId on tasks'),
            name: z.string().describe('Status name'),
            type: z.number().optional().describe('Provider status type'),
            index: z.number().optional().describe('Provider display order'),
            isDefault: z.boolean().optional().describe('Whether this is the default status')
          })
        )
        .optional(),
      labels: z
        .array(
          z.object({
            labelId: z.string().describe('Label ID'),
            name: z.string().describe('Label name'),
            color: z.string().optional().describe('Label color')
          })
        )
        .optional(),
      raw: z.unknown().describe('Complete provider response with all project settings')
    })
  )
  .handleInvocation(async ctx => {
    let project = requireRecord(
      await new Client(ctx.auth).getProjectDetails(ctx.input.projectId)
    );
    return {
      output: {
        projectId: requiredString(project._id, 'project ID'),
        projectName: requiredString(project.Name, 'project name'),
        workspaceId: optionalString(project.CompanyId),
        description: project.Description === null ? null : optionalString(project.Description),
        customerId: optionalString(project.CustomerId),
        startDate: optionalString(project.StartDate),
        createdAt: optionalString(project.CreatedTime),
        updatedAt: optionalString(project.UpdatedTime),
        milestoneEnabled: optionalBoolean(project.IsMilestone),
        estimateEnabled: optionalBoolean(project.IsEstimate),
        projectUsers: optionalStrings(project.ProjectUsers),
        statuses: Array.isArray(project.Status)
          ? requireRecords(project.Status).map(status => ({
              statusId: requiredString(status._id, 'status ID'),
              name: requiredString(status.Name, 'status name'),
              type: optionalNumber(status.Type),
              index: optionalNumber(status.Index),
              isDefault: optionalBoolean(status.Default)
            }))
          : undefined,
        labels: Array.isArray(project.LabelsList)
          ? requireRecords(project.LabelsList).map(label => ({
              labelId: requiredString(label._id, 'label ID'),
              name: requiredString(label.Name, 'label name'),
              color: optionalString(label.Color)
            }))
          : undefined,
        raw: project
      },
      message: `Retrieved extended project details.`
    };
  })
  .build();
