import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let cohortSync = SlateTrigger.create(spec, {
  name: 'Cohort Sync',
  key: 'cohort_sync',
  description:
    'Receives cohort membership changes from Mixpanel via webhook. Triggers when users are added to, removed from, or a full cohort membership list is synced. Must be configured manually in Mixpanel Integrations UI.',
  instructions: [
    'Configure the webhook URL in Mixpanel under Project Settings > Integrations > Custom Webhook.',
    'Cohorts sync every 30 minutes with a batch size of 1000 users.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['members', 'add_members', 'remove_members'])
        .describe('The sync action type'),
      cohortName: z.string().describe('Name of the cohort'),
      cohortId: z.number().describe('ID of the cohort'),
      cohortDescription: z.string().optional().describe('Description of the cohort'),
      members: z
        .array(
          z.object({
            distinctId: z.string().describe('User distinct ID'),
            email: z.string().optional().describe('User email'),
            name: z.string().optional().describe('User name'),
            phone: z.string().optional().describe('User phone number')
          })
        )
        .describe('Cohort members in this batch'),
      page: z.number().optional().describe('Current page for paginated results'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .output(
    z.object({
      cohortName: z.string().describe('Cohort name'),
      cohortId: z.number().describe('Cohort ID'),
      cohortDescription: z.string().describe('Cohort description'),
      action: z.string().describe('Sync action: members, add_members, or remove_members'),
      memberCount: z.number().describe('Number of members in this batch'),
      members: z
        .array(
          z.object({
            distinctId: z.string().describe('User distinct ID'),
            email: z.string().optional().describe('User email'),
            name: z.string().optional().describe('User name'),
            phone: z.string().optional().describe('User phone number')
          })
        )
        .describe('Cohort members in this batch')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let action = data.action ?? data.type ?? 'members';
      let members = (data.members ?? data.profiles ?? []).map((m: any) => ({
        distinctId: m.distinct_id ?? m.$distinct_id ?? '',
        email: m.email ?? m.$email,
        name: m.name ?? m.$name,
        phone: m.phone ?? m.$phone
      }));

      return {
        inputs: [
          {
            action,
            cohortName: data.cohort_name ?? data.name ?? '',
            cohortId: data.cohort_id ?? data.id ?? 0,
            cohortDescription: data.cohort_description ?? data.description,
            members,
            page: data.page,
            totalPages: data.total_pages
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { input } = ctx;

      return {
        type: `cohort.${input.action}`,
        id: `${input.cohortId}-${input.action}-${input.page ?? 0}-${Date.now()}`,
        output: {
          cohortName: input.cohortName,
          cohortId: input.cohortId,
          cohortDescription: input.cohortDescription ?? '',
          action: input.action,
          memberCount: input.members.length,
          members: input.members
        }
      };
    }
  })
  .build();
