import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let validationDetailSchema = z.object({
  validationField: z.string().optional(),
  validationMessage: z.string().optional(),
  validationCode: z.string().optional()
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
      workspaceId: workspaceIdSchema,
      include: z
        .array(z.enum(['emailEmbedHTML', 'fields']))
        .optional()
        .describe('Additional prospect fields to retrieve'),
      campaignId: z.string().describe('ID of the dynamic video campaign'),
      email: z.string().describe('Email address of the prospect to look up')
    })
  )
  .output(
    z.object({
      prospectId: z.string().optional().describe('Provider prospect ID'),
      originalBackgroundUrl: z.string().optional(),
      emailEmbedHTML: z.string().optional(),
      fields: z.record(z.string(), z.unknown()).optional(),
      raw: z.unknown().optional().describe('Complete provider response'),
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
    let client = createClient(ctx);

    let prospect = await client.getProspect(
      ctx.input.campaignId,
      ctx.input.email,
      ctx.input.include?.join(',')
    );

    return {
      output: {
        prospectId: prospect.id ?? prospect._id,
        originalBackgroundUrl: prospect.originalBackgroundUrl,
        emailEmbedHTML: prospect.emailEmbedHTML,
        fields: prospect.fields,
        raw: prospect,
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
      message: `Retrieved prospect **${prospect.contactName || ctx.input.email}**${prospect.status !== undefined ? ` — status: **${prospect.status}**` : ''}${prospect.shareUrl ? `. Share URL: ${prospect.shareUrl}` : ''}.`
    };
  })
  .build();
