import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let templateEvent = SlateTrigger.create(spec, {
  name: 'Template Event',
  key: 'template_event',
  description:
    'Triggered when a template is created or updated. Configure the webhook URL in the DocuSeal console under Settings > Webhooks.'
})
  .input(
    z.object({
      eventType: z
        .enum(['template.created', 'template.updated'])
        .describe('Type of template event'),
      templateId: z.number().describe('Template ID'),
      name: z.string().optional().describe('Template name'),
      slug: z.string().optional().describe('Template slug'),
      externalId: z.string().nullable().optional().describe('External ID'),
      folderName: z.string().nullable().optional().describe('Folder name'),
      fields: z.array(z.any()).optional().describe('Template fields'),
      submitters: z.array(z.any()).optional().describe('Submitter roles'),
      documents: z.array(z.any()).optional().describe('Template documents'),
      authorId: z.number().optional().describe('Author user ID'),
      authorEmail: z.string().optional().describe('Author email'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Updated timestamp')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('Template ID'),
      name: z.string().optional().describe('Template name'),
      slug: z.string().optional().describe('Template slug'),
      externalId: z.string().nullable().optional().describe('External ID'),
      folderName: z.string().nullable().optional().describe('Folder name'),
      fields: z.array(z.any()).optional().describe('Template fields'),
      submitters: z.array(z.any()).optional().describe('Submitter roles'),
      authorId: z.number().optional().describe('Author user ID'),
      authorEmail: z.string().optional().describe('Author email'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Updated timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event_type as string;

      if (!eventType?.startsWith('template.')) {
        return { inputs: [] };
      }

      let data = body.data || body;

      let input = {
        eventType: eventType as 'template.created' | 'template.updated',
        templateId: data.id,
        name: data.name,
        slug: data.slug,
        externalId: data.external_id,
        folderName: data.folder_name,
        fields: data.fields || [],
        submitters: data.submitters || [],
        documents: data.documents || [],
        authorId: data.author?.id,
        authorEmail: data.author?.email,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      return { inputs: [input] };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}_${ctx.input.templateId}_${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          templateId: ctx.input.templateId,
          name: ctx.input.name,
          slug: ctx.input.slug,
          externalId: ctx.input.externalId,
          folderName: ctx.input.folderName,
          fields: ctx.input.fields,
          submitters: ctx.input.submitters,
          authorId: ctx.input.authorId,
          authorEmail: ctx.input.authorEmail,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
