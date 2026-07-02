import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { SignPathClient } from '../lib/client';
import { spec } from '../spec';

export let signingRequestStatusChange = SlateTrigger.create(spec, {
  name: 'Signing Request Status Change',
  key: 'signing_request_status_change',
  description:
    "Triggers when a signing request reaches a final status: Completed, Failed, Denied, or Canceled. The webhook URL must be configured in the project's Integration section in SignPath."
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID from the webhook payload'),
      signingRequestId: z.string().describe('ID of the signing request'),
      status: z.string().describe('New status of the signing request')
    })
  )
  .output(
    z.object({
      signingRequestId: z.string().describe('ID of the signing request'),
      status: z.string().describe('New status (Completed, Failed, Denied, or Canceled)'),
      projectSlug: z.string().describe('Slug of the project'),
      projectName: z.string().describe('Name of the project'),
      signingPolicySlug: z.string().describe('Slug of the signing policy'),
      signingPolicyName: z.string().describe('Name of the signing policy'),
      description: z.string().describe('Description of the signing request'),
      signedArtifactLink: z
        .string()
        .describe('URL to download the signed artifact (available when completed)'),
      createdDate: z.string().describe('Date when the signing request was created')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        OrganizationId?: string;
        SigningRequestId?: string;
        Status?: string;
      };

      return {
        inputs: [
          {
            organizationId: body.OrganizationId || '',
            signingRequestId: body.SigningRequestId || '',
            status: body.Status || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new SignPathClient({
        token: ctx.auth.token,
        organizationId: ctx.config.organizationId,
        baseUrl: ctx.config.baseUrl
      });

      let signingRequest = await client.getSigningRequest(ctx.input.signingRequestId);

      return {
        type: `signing_request.${ctx.input.status.toLowerCase()}`,
        id: ctx.input.signingRequestId,
        output: {
          signingRequestId: ctx.input.signingRequestId,
          status: ctx.input.status,
          projectSlug: signingRequest.projectSlug || '',
          projectName: signingRequest.projectName || '',
          signingPolicySlug: signingRequest.signingPolicySlug || '',
          signingPolicyName: signingRequest.signingPolicyName || '',
          description: signingRequest.description || '',
          signedArtifactLink: signingRequest.signedArtifactLink || '',
          createdDate: signingRequest.createdDate || ''
        }
      };
    }
  })
  .build();
