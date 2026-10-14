import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getInspection = SlateTool.create(spec, {
  name: 'Get Inspection',
  key: 'get_inspection',
  description: `Retrieve full details of a specific inspection by ID, including its status, owner, site, template, timestamps, and optionally its answers/responses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      inspectionId: z.string().describe('The unique ID of the inspection to retrieve'),
      includeAnswers: z
        .boolean()
        .optional()
        .describe('Whether to also fetch inspection answers/responses')
    })
  )
  .output(
    z.object({
      inspectionId: z.string().describe('Unique inspection identifier'),
      title: z.string().optional().describe('Inspection title'),
      templateId: z.string().optional().describe('Template ID used for this inspection'),
      status: z.string().optional().describe('Current inspection status'),
      ownerId: z.string().optional().describe('User ID of the inspection owner'),
      siteId: z.string().optional().describe('Associated site ID'),
      organisationId: z.string().optional().describe('Organization ID'),
      archived: z.boolean().optional().describe('Whether the inspection is archived'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      startedAt: z.string().optional().describe('When the inspection was started'),
      completedAt: z.string().optional().describe('When the inspection was completed'),
      answers: z.any().optional().describe('Inspection answers/responses if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let inspection = await client.getInspection(ctx.input.inspectionId);
    let answers: any;

    if (ctx.input.includeAnswers) {
      answers = await client.getInspectionAnswers(ctx.input.inspectionId);
    }

    return {
      output: {
        inspectionId: inspection.id || inspection.audit_id || ctx.input.inspectionId,
        title: inspection.title || inspection.audit_title || undefined,
        templateId: inspection.template_id ?? undefined,
        status:
          inspection.status ??
          (inspection.is_marked_as_complete === true
            ? 'complete'
            : inspection.is_marked_as_complete === false
              ? 'in_progress'
              : undefined),
        ownerId: inspection.owner_id ?? undefined,
        siteId: inspection.site_id ?? inspection.site?.id ?? undefined,
        organisationId: inspection.organisation_id ?? undefined,
        archived: inspection.archived ?? undefined,
        createdAt: inspection.created_at ?? undefined,
        modifiedAt: inspection.modified_at ?? undefined,
        startedAt: inspection.started_at ?? undefined,
        completedAt: inspection.completed_at ?? undefined,
        answers: answers
      },
      message: `Retrieved inspection **${inspection.title || inspection.audit_title || ctx.input.inspectionId}** (status: ${inspection.status || 'unknown'}).`
    };
  })
  .build();
