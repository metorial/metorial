import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description:
    'Discover WhatsApp template IDs, names, approval state, and languages before using send_template.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Positive whole-number page to retrieve.')
    })
  )
  .output(
    z.object({
      templates: z.array(
        z.object({
          templateId: z.string().optional(),
          name: z.string().optional(),
          isApproved: z.boolean().optional(),
          languages: z.array(z.string()),
          localizations: z.array(z.any()).optional()
        })
      ),
      totalCount: z.number().optional(),
      next: z.string().nullable().optional(),
      previous: z.string().nullable().optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listTemplates(ctx.input);
    let items = Array.isArray(result)
      ? result
      : Array.isArray(result?.results)
        ? result.results
        : [];
    let templates = items.map((template: any) => {
      let localizations = Array.isArray(template.templatelocalization_set)
        ? template.templatelocalization_set
        : [];
      let languages = template.language
        ? [template.language]
        : localizations
            .map((localization: any) => localization.language)
            .filter((language: unknown) => typeof language === 'string');
      return {
        templateId:
          template.id === undefined || template.id === null ? undefined : String(template.id),
        name: template.name ?? undefined,
        isApproved:
          template.is_approved ??
          (template.status ? template.status === 'APPROVED' : undefined),
        languages,
        localizations
      };
    });
    return {
      output: {
        templates,
        totalCount: result?.count ?? templates.length,
        next: result?.next,
        previous: result?.previous,
        raw: result
      },
      message: `Found **${templates.length}** templates`
    };
  })
  .build();
