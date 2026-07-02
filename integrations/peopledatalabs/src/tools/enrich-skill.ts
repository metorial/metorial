import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichSkill = SlateTool.create(spec, {
  name: 'Enrich Skill',
  key: 'enrich_skill',
  description: `Enrich and standardize a skill string by matching it against the PDL Skill Dataset. Returns the cleaned skill name. Useful for normalizing skills across different data sources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      skill: z.string().describe('Raw skill to enrich (e.g. "machine learn")'),
      titlecase: z.boolean().optional().describe('Titlecase the output fields')
    })
  )
  .output(
    z.object({
      cleanedSkill: z.string().nullable().optional().describe('Standardized skill name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let params: Record<string, unknown> = {};
    if (ctx.input.titlecase !== undefined) params.titlecase = ctx.input.titlecase;

    let result = await client.enrichSkill(ctx.input.skill, params);
    let data = result.data || result;

    return {
      output: {
        cleanedSkill: data.cleaned_skill ?? data.skill ?? null
      },
      message:
        data.cleaned_skill || data.skill
          ? `"${ctx.input.skill}" → **${data.cleaned_skill || data.skill}**`
          : `No standardized skill found for "${ctx.input.skill}".`
    };
  })
  .build();
