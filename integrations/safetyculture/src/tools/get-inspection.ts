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
        inspectionId: inspection.id || inspection.audit_id,
        title: inspection.title || inspection.audit_title,
        templateId: inspection.template_id,
        status: inspection.status,
        ownerId: inspection.owner_id,
        siteId: inspection.site_id,
        organisationId: inspection.organisation_id,
        archived: inspection.archived,
        createdAt: inspection.created_at,
        modifiedAt: inspection.modified_at,
        startedAt: inspection.started_at,
        completedAt: inspection.completed_at,
        answers: answers
      },
      message: `Retrieved inspection **${inspection.title || inspection.audit_title || ctx.input.inspectionId}** (status: ${inspection.status || 'unknown'}).`
    };
  })
  .build();
