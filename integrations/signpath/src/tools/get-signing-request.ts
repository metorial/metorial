import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignPathClient } from '../lib/client';
import { spec } from '../spec';

export let getSigningRequest = SlateTool.create(spec, {
  name: 'Get Signing Request',
  key: 'get_signing_request',
  description: `Retrieve the status and details of a signing request by its ID. Returns the current status, project info, signing policy info, artifact links, origin data, and parameters. Use this to check whether a signing request has completed, is waiting for approval, or has failed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      signingRequestId: z.string().describe('ID of the signing request to retrieve')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Current status of the signing request'),
      workflowStatus: z
        .string()
        .describe('Workflow status (e.g., WaitingForApproval, Processing, Completed)'),
      isFinalStatus: z
        .boolean()
        .describe('Whether the signing request has reached a final status'),
      description: z.string().describe('Description of the signing request'),
      projectSlug: z.string().describe('Slug of the project'),
      projectName: z.string().describe('Name of the project'),
      artifactConfigurationSlug: z.string().describe('Slug of the artifact configuration'),
      artifactConfigurationName: z.string().describe('Name of the artifact configuration'),
      signingPolicySlug: z.string().describe('Slug of the signing policy'),
      signingPolicyName: z.string().describe('Name of the signing policy'),
      unsignedArtifactLink: z.string().describe('URL to download the unsigned artifact'),
      signedArtifactLink: z
        .string()
        .describe('URL to download the signed artifact (available when completed)'),
      createdDate: z.string().describe('Date when the signing request was created'),
      parameters: z
        .record(z.string(), z.string())
        .describe('User-defined parameters of the signing request'),
      origin: z.record(z.string(), z.unknown()).describe('Origin verification data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignPathClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.getSigningRequest(ctx.input.signingRequestId);

    return {
      output: {
        status: data.status || '',
        workflowStatus: data.workflowStatus || '',
        isFinalStatus: data.isFinalStatus || false,
        description: data.description || '',
        projectSlug: data.projectSlug || '',
        projectName: data.projectName || '',
        artifactConfigurationSlug: data.artifactConfigurationSlug || '',
        artifactConfigurationName: data.artifactConfigurationName || '',
        signingPolicySlug: data.signingPolicySlug || '',
        signingPolicyName: data.signingPolicyName || '',
        unsignedArtifactLink: data.unsignedArtifactLink || '',
        signedArtifactLink: data.signedArtifactLink || '',
        createdDate: data.createdDate || '',
        parameters: data.parameters || {},
        origin: data.origin || {}
      },
      message: `Signing request **${ctx.input.signingRequestId}** is in status **${data.status}** (workflow: ${data.workflowStatus}). Project: ${data.projectName}, Policy: ${data.signingPolicyName}.`
    };
  })
  .build();
