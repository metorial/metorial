import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichJobTitle = SlateTool.create(spec, {
  name: 'Enrich Job Title',
  key: 'enrich_job_title',
  description: `Enrich and standardize a job title string. Returns the cleaned job title along with its role, sub-role, and seniority levels. Useful for normalizing job titles across different data sources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobTitle: z.string().describe('Raw job title to enrich (e.g. "senior software eng")'),
      titlecase: z.boolean().optional().describe('Titlecase the output fields')
    })
  )
  .output(
    z.object({
      cleanedJobTitle: z.string().nullable().optional().describe('Standardized job title'),
      role: z
        .string()
        .nullable()
        .optional()
        .describe('Broad role category (e.g. "engineering")'),
      subRole: z
        .string()
        .nullable()
        .optional()
        .describe('Specific sub-role (e.g. "software engineering")'),
      levels: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('Seniority levels (e.g. ["senior", "ic"])')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.titlecase !== undefined) params.titlecase = ctx.input.titlecase;

    let result = await client.enrichJobTitle(ctx.input.jobTitle, params);
    let data = result.data || result;

    return {
      output: {
        cleanedJobTitle: data.cleaned_job_title ?? data.job_title ?? null,
        role: data.role ?? null,
        subRole: data.sub_role ?? null,
        levels: data.levels ?? null
      },
      message:
        data.cleaned_job_title || data.job_title
          ? `"${ctx.input.jobTitle}" → **${data.cleaned_job_title || data.job_title}**${data.role ? ` (${data.role}${data.sub_role ? ` / ${data.sub_role}` : ''})` : ''}`
          : `No standardized job title found for "${ctx.input.jobTitle}".`
    };
  })
  .build();
