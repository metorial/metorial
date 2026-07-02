import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

export let getFeature = SlateTool.create(spec, {
  name: 'Get Feature',
  key: 'get_feature',
  description: `Retrieve full details of a specific feature by its ID or reference number. Returns the feature's name, description, status, assignee, dates, tags, custom fields, and requirements.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      featureId: z.string().describe('Feature ID or reference number (e.g. APP-123)')
    })
  )
  .output(
    z.object({
      featureId: z.string().describe('Feature ID'),
      referenceNum: z.string().describe('Feature reference number'),
      name: z.string().describe('Feature name'),
      description: z.string().optional().describe('Feature description (HTML)'),
      status: z.string().optional().describe('Workflow status name'),
      assignee: z.string().optional().describe('Assigned user name'),
      createdBy: z.string().optional().describe('Creator user name'),
      startDate: z.string().optional().describe('Start date'),
      dueDate: z.string().optional().describe('Due date'),
      tags: z.array(z.string()).optional().describe('Tags'),
      score: z.number().optional().describe('Feature score'),
      progress: z.number().optional().describe('Progress percentage'),
      url: z.string().optional().describe('Aha! URL'),
      releaseName: z.string().optional().describe('Parent release name'),
      epicName: z.string().optional().describe('Parent epic name'),
      requirements: z
        .array(
          z.object({
            requirementId: z.string().describe('Requirement ID'),
            referenceNum: z.string().describe('Requirement reference number'),
            name: z.string().describe('Requirement name'),
            status: z.string().optional().describe('Workflow status')
          })
        )
        .optional()
        .describe('Feature requirements'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);
    let feature = await client.getFeature(ctx.input.featureId);

    return {
      output: {
        featureId: feature.id,
        referenceNum: feature.reference_num,
        name: feature.name,
        description: feature.description,
        status: feature.workflow_status?.name,
        assignee: feature.assigned_to_user?.name,
        createdBy: feature.created_by_user?.name,
        startDate: feature.start_date,
        dueDate: feature.due_date,
        tags: feature.tags,
        score: feature.score,
        progress: feature.progress,
        url: feature.url,
        releaseName: feature.release?.name,
        epicName: feature.epic?.name,
        requirements: feature.requirements?.map(r => ({
          requirementId: r.id,
          referenceNum: r.reference_num,
          name: r.name,
          status: r.workflow_status?.name
        })),
        createdAt: feature.created_at,
        updatedAt: feature.updated_at
      },
      message: `Feature **${feature.reference_num}** — ${feature.name} (${feature.workflow_status?.name || 'No status'}).`
    };
  })
  .build();
