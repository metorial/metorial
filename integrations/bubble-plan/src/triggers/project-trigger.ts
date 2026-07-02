import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let projectTrigger = SlateTrigger.create(spec, {
  name: 'New Project',
  key: 'new_project',
  description: 'Triggers when a new project is created in Project Bubble.'
})
  .input(
    z.object({
      resourceUrl: z.string().describe('URL to the created resource')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      startDate: z.string().optional().describe('Project start date'),
      dueDate: z.string().optional().describe('Project due date'),
      clientId: z.string().optional().describe('Associated client ID'),
      progress: z.number().optional().describe('Project progress percentage'),
      dateCreated: z.string().optional().describe('Date the project was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      let result = await client.subscribeWebhook(ctx.input.webhookBaseUrl, 'new_project');
      let subscriptionId = String(
        result?.id || result?.data?.id || result?.subscription_id || ''
      );

      return {
        registrationDetails: { subscriptionId }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      await client.unsubscribeWebhook(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      return {
        inputs: [
          {
            resourceUrl: data.resource_url || ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.config.domain
      });

      let result = await client.fetchResourceByUrl(ctx.input.resourceUrl);
      let p = result?.data?.[0] || result?.data || result;

      return {
        type: 'project.created',
        id: String(p.project_id || ctx.input.resourceUrl),
        output: {
          projectId: String(p.project_id || ''),
          projectName: p.project_name || '',
          description: p.description || undefined,
          startDate: p.start_date || undefined,
          dueDate: p.due_date || undefined,
          clientId: p.client_id ? String(p.client_id) : undefined,
          progress: p.progress ?? undefined,
          dateCreated: p.date_created || undefined
        }
      };
    }
  })
  .build();
