import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let validationDetailSchema = z.object({
  validationField: z.string().optional(),
  validationMessage: z.string().optional()
});

export let getProspect = SlateTool.create(spec, {
  name: 'Get Prospect',
  key: 'get_prospect',
  description: `Look up a prospect's data and personalized video status by email address within a specific campaign. Returns the share URL for the generated video when available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the dynamic video campaign'),
      email: z.string().describe('Email address of the prospect to look up')
    })
  )
  .output(
    z.object({
      contactName: z.string().optional(),
      contactEmail: z.string().optional(),
      company: z.string().optional(),
      jobTitle: z.string().optional(),
      backgroundUrl: z.string().optional(),
      status: z
        .string()
        .optional()
        .describe(
          'Prospect video status: saved, billed, errored, processing, uploaded, or completed'
        ),
      valid: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      deletedAt: z.string().nullable().optional(),
      shareUrl: z
        .string()
        .optional()
        .describe('Share URL for the generated personalized video'),
      validationErrors: z.array(validationDetailSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      workspaceId: ctx.config.workspaceId
    });

    let prospect = await client.getProspect(ctx.input.campaignId, ctx.input.email);

    return {
      output: {
        contactName: prospect.contactName,
        contactEmail: prospect.contactEmail,
        company: prospect.company,
        jobTitle: prospect.jobTitle,
        backgroundUrl: prospect.backgroundUrl,
        status: prospect.status,
        valid: prospect.valid,
        createdAt: prospect.createdAt,
        updatedAt: prospect.updatedAt,
        deletedAt: prospect.deletedAt,
        shareUrl: prospect.shareUrl,
        validationErrors: prospect.validationDetails
      },
      message: `Prospect **${prospect.contactName || ctx.input.email}** — status: **${prospect.status || 'unknown'}**${prospect.shareUrl ? `. Share URL: ${prospect.shareUrl}` : ''}.`
    };
  })
  .build();
