import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let getActivityReports = SlateTool.create(spec, {
  name: 'Get Activity Reports',
  key: 'get_activity_reports',
  description: `Retrieve audit activity logs for admin actions, user logins, Drive activity, and other application events. Supports filtering by event type, time range, user, and IP address.`,
  instructions: [
    'Use "all" as the userKey to get activities for all users.',
    'Common application names: admin, login, drive, mobile, token, groups, saml, calendar, gplus, user_accounts.',
    'Some activity data may have lag times from a few minutes to 1-3 days.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.getActivityReports)
  .input(
    z.object({
      userKey: z.string().describe('Email or "all" to retrieve activities for all users'),
      applicationName: z
        .enum([
          'admin',
          'login',
          'drive',
          'mobile',
          'token',
          'groups',
          'saml',
          'calendar',
          'gplus',
          'user_accounts',
          'access_transparency',
          'context_aware_access',
          'chrome',
          'data_studio',
          'keep',
          'jamboard',
          'meet',
          'rules'
        ])
        .describe('Application to get activity logs for'),
      eventName: z.string().optional().describe('Specific event name to filter by'),
      startTime: z
        .string()
        .optional()
        .describe('Start of the time range in RFC 3339 format (e.g. 2024-01-01T00:00:00Z)'),
      endTime: z.string().optional().describe('End of the time range in RFC 3339 format'),
      filters: z
        .string()
        .optional()
        .describe('Event parameter filter (e.g. "doc_title==My Document")'),
      actorIpAddress: z.string().optional().describe('Filter by IP address of the actor'),
      orgUnitId: z.string().optional().describe('Org unit ID to scope results'),
      maxResults: z
        .number()
        .optional()
        .describe('Max results per page (1-1000). Defaults to 100.'),
      pageToken: z.string().optional()
    })
  )
  .output(
    z.object({
      activities: z.array(
        z.object({
          activityId: z.string().optional(),
          actorEmail: z.string().optional(),
          actorProfileId: z.string().optional(),
          ipAddress: z.string().optional(),
          time: z.string().optional(),
          events: z
            .array(
              z.object({
                type: z.string().optional(),
                name: z.string().optional(),
                parameters: z
                  .array(
                    z.object({
                      name: z.string().optional(),
                      value: z.string().optional(),
                      multiValue: z.array(z.string()).optional(),
                      intValue: z.string().optional(),
                      boolValue: z.boolean().optional()
                    })
                  )
                  .optional()
              })
            )
            .optional()
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    let result = await client.listActivities({
      userKey: ctx.input.userKey,
      applicationName: ctx.input.applicationName,
      eventName: ctx.input.eventName,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      filters: ctx.input.filters,
      actorIpAddress: ctx.input.actorIpAddress,
      orgUnitId: ctx.input.orgUnitId,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken
    });

    let activities = (result.items || []).map((item: any) => ({
      activityId: item.id?.uniqueQualifier,
      actorEmail: item.actor?.email,
      actorProfileId: item.actor?.profileId,
      ipAddress: item.ipAddress,
      time: item.id?.time,
      events: (item.events || []).map((e: any) => ({
        type: e.type,
        name: e.name,
        parameters: (e.parameters || []).map((p: any) => ({
          name: p.name,
          value: p.value,
          multiValue: p.multiValue,
          intValue: p.intValue ? String(p.intValue) : undefined,
          boolValue: p.boolValue
        }))
      }))
    }));

    return {
      output: {
        activities,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${activities.length}** activity entries for **${ctx.input.applicationName}**.${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
