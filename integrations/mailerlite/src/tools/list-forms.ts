import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `Retrieves signup forms filtered by type (popup, embedded, promotion). Can also fetch subscribers who signed up through a specific form.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      formType: z.enum(['popup', 'embedded', 'promotion']).describe('Type of forms to list'),
      formId: z
        .string()
        .optional()
        .describe('Form ID — if provided, returns subscribers for this form'),
      name: z.string().optional().describe('Filter forms by name'),
      subscriberStatus: z
        .enum(['active', 'unsubscribed', 'unconfirmed', 'bounced', 'junk'])
        .optional()
        .describe('Filter form subscribers by status (only when formId is provided)'),
      limit: z.number().optional().describe('Number of results per page'),
      page: z.number().optional().describe('Page number'),
      sort: z.string().optional().describe('Sort field')
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.string().describe('Form ID'),
            formType: z.string().describe('Form type'),
            name: z.string().describe('Form name'),
            conversions: z.number().optional().describe('Number of conversions'),
            conversionRate: z.any().optional().describe('Conversion rate'),
            isActive: z.boolean().optional().describe('Whether the form is active'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of forms'),
      subscribers: z
        .array(
          z.object({
            subscriberId: z.string().describe('Subscriber ID'),
            email: z.string().describe('Email address'),
            status: z.string().describe('Subscriber status')
          })
        )
        .optional()
        .describe('Subscribers who signed up through the form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.formId) {
      let result = await client.getFormSubscribers(ctx.input.formId, {
        status: ctx.input.subscriberStatus,
        limit: ctx.input.limit,
        page: ctx.input.page
      });

      let subscribers = (result.data || []).map((s: any) => ({
        subscriberId: s.id,
        email: s.email,
        status: s.status
      }));

      return {
        output: { subscribers },
        message: `Retrieved **${subscribers.length}** subscribers from form **${ctx.input.formId}**.`
      };
    }

    let result = await client.listForms(ctx.input.formType, {
      name: ctx.input.name,
      limit: ctx.input.limit,
      page: ctx.input.page,
      sort: ctx.input.sort
    });

    let forms = (result.data || []).map((f: any) => ({
      formId: f.id,
      formType: f.type,
      name: f.name,
      conversions: f.conversions_count,
      conversionRate: f.conversion_rate,
      isActive: f.is_active,
      createdAt: f.created_at
    }));

    return {
      output: { forms },
      message: `Retrieved **${forms.length}** ${ctx.input.formType} forms.`
    };
  })
  .build();
