import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let questionnaireRequestSchema = z.object({
  requestId: z.string().describe('ID of the questionnaire request'),
  status: z.string().nullable().optional().describe('Request status'),
  source: z.string().nullable().optional().describe('Source integration'),
  submitterEmail: z.string().nullable().optional().describe('Submitter email'),
  submitterExternalId: z
    .string()
    .nullable()
    .optional()
    .describe('External system submitter ID'),
  submitterExternalName: z
    .string()
    .nullable()
    .optional()
    .describe('External system submitter name'),
  externalId: z.string().nullable().optional().describe('External ticket ID')
});

export let createQuestionnaireRequest = SlateTool.create(spec, {
  name: 'Create Questionnaire Request',
  key: 'create_questionnaire_request',
  description: `Create a questionnaire request for intake/triage workflows. Used to submit a questionnaire from an external system (e.g., Salesforce, a ticketing system) into Conveyor's processing pipeline. Provide either an external ID or Salesforce case IDs.`,
  instructions: [
    'Provide either externalId or caseIds, not both.',
    'rawData should be a JSON string containing context from the external ticket.'
  ]
})
  .input(
    z.object({
      submitterEmail: z.string().optional().describe('Email of the person submitting'),
      submitterExternalId: z
        .string()
        .optional()
        .describe('Submitter ID in the external system'),
      submitterExternalName: z
        .string()
        .optional()
        .describe('Submitter name in the external system'),
      externalId: z.string().optional().describe('Unique ticket ID from the external system'),
      caseIds: z.string().optional().describe('Salesforce Case IDs'),
      rawData: z.string().optional().describe('JSON string with context data from the ticket'),
      source: z
        .string()
        .optional()
        .describe('Integration source name (e.g., "salesforce", "workato")')
    })
  )
  .output(
    z.object({
      questionnaireRequests: z
        .array(questionnaireRequestSchema)
        .describe('Created questionnaire requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data = await client.createQuestionnaireRequest({
      submitterEmail: ctx.input.submitterEmail,
      submitterExternalId: ctx.input.submitterExternalId,
      submitterExternalName: ctx.input.submitterExternalName,
      externalId: ctx.input.externalId,
      caseIds: ctx.input.caseIds,
      rawData: ctx.input.rawData,
      source: ctx.input.source
    });

    let requests = (data?._embedded?.questionnaire_requests || []).map((r: any) => ({
      requestId: r.id,
      status: r.status,
      source: r.source,
      submitterEmail: r.submitter_email,
      submitterExternalId: r.submitter_external_id,
      submitterExternalName: r.submitter_external_name,
      externalId: r.external_id
    }));

    return {
      output: { questionnaireRequests: requests },
      message: `Created **${requests.length}** questionnaire request(s).`
    };
  })
  .build();

export let updateQuestionnaireRequest = SlateTool.create(spec, {
  name: 'Update Questionnaire Request',
  key: 'update_questionnaire_request',
  description: `Update an existing questionnaire request with new context data or files. Used to add additional information to a previously submitted questionnaire intake request.`
})
  .input(
    z.object({
      externalId: z.string().optional().describe('External ticket ID to identify the request'),
      caseIds: z.string().optional().describe('Salesforce Case IDs'),
      rawData: z.string().optional().describe('Updated JSON context data'),
      source: z.string().optional().describe('Integration source name')
    })
  )
  .output(
    z.object({
      questionnaireRequests: z
        .array(questionnaireRequestSchema)
        .describe('Updated questionnaire requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data = await client.updateQuestionnaireRequest({
      externalId: ctx.input.externalId,
      caseIds: ctx.input.caseIds,
      rawData: ctx.input.rawData,
      source: ctx.input.source
    });

    let requests = (data?._embedded?.questionnaire_requests || []).map((r: any) => ({
      requestId: r.id,
      status: r.status,
      source: r.source,
      submitterEmail: r.submitter_email,
      submitterExternalId: r.submitter_external_id,
      submitterExternalName: r.submitter_external_name,
      externalId: r.external_id
    }));

    return {
      output: { questionnaireRequests: requests },
      message: `Updated **${requests.length}** questionnaire request(s).`
    };
  })
  .build();
