import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignPathClient } from '../lib/client';
import { spec } from '../spec';

export let resubmitSigningRequest = SlateTool.create(spec, {
  name: 'Resubmit Signing Request',
  key: 'resubmit_signing_request',
  description: `Resubmit an existing signing request with a different signing policy. Useful for release candidates where you want to postpone the release decision. Origin verification is evaluated based on the original request's origin data, preserving integrity even when fully detached from the build process.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      originalSigningRequestId: z
        .string()
        .describe('ID of the original signing request to resubmit'),
      signingPolicySlug: z.string().describe('Slug of the new signing policy to use'),
      description: z
        .string()
        .optional()
        .describe('Optional description for the resubmitted request')
    })
  )
  .output(
    z.object({
      signingRequestId: z.string().describe('ID of the newly created signing request'),
      signingRequestUrl: z.string().describe('Full URL of the newly created signing request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignPathClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.resubmitSigningRequest({
      originalSigningRequestId: ctx.input.originalSigningRequestId,
      signingPolicySlug: ctx.input.signingPolicySlug,
      description: ctx.input.description
    });

    return {
      output: result,
      message: `Signing request resubmitted. New request ID: **${result.signingRequestId}** (original: ${ctx.input.originalSigningRequestId}, new policy: ${ctx.input.signingPolicySlug})`
    };
  })
  .build();
