import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPortalFeedback = SlateTool.create(spec, {
  name: 'Create Portal Feedback',
  key: 'create_portal_feedback',
  description:
    'Submit customer feedback through the legacy v1 public portal endpoint, optionally linked to a project. Use list_contacts or list_companies to find your workspace ID, or copy it from Settings → API.'
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID from list_contacts, list_companies, or Settings → API. Uses the configured workspace when omitted.'
        ),
      text: z.string().min(1).describe('Customer feedback text'),
      painLevel: z
        .enum(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'])
        .describe('Severity of the feedback'),
      email: z.email().describe('Email address of the customer submitting feedback'),
      projectId: z.string().optional().describe('Portal project ID from list_projects'),
      notify: z
        .object({
          slack: z.boolean().optional().describe('Notify through Slack'),
          email: z.boolean().optional().describe('Notify through email')
        })
        .optional()
        .describe('Notification preferences for the feedback')
    })
  )
  .output(
    z.object({
      submitted: z.boolean().describe('Whether Productlane accepted the submission'),
      workspaceId: z.string().describe('Workspace receiving the feedback'),
      response: z.unknown().describe('Feedback response returned by Productlane')
    })
  )
  .handleInvocation(async ctx => {
    let workspaceId = ctx.input.workspaceId || ctx.config.workspaceId;
    if (!workspaceId) {
      throw createApiServiceError(
        'workspaceId is required. Use list_contacts or list_companies to discover it, or copy it from Settings → API.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let response = await client.createPortalFeedback({
      ...ctx.input,
      workspaceId
    });

    return {
      output: { submitted: true, workspaceId, response },
      message: `Submitted customer feedback to workspace ${workspaceId}.`
    };
  })
  .build();
