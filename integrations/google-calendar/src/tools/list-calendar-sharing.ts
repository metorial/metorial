import { buildApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let listCalendarSharing = SlateTool.create(spec, {
  name: 'List Calendar Sharing',
  key: 'list_calendar_sharing',
  description:
    "List the sharing rules for a Google Calendar, including each rule's access role and user, group, domain, or public scope.",
  tags: { readOnly: true }
})
  .scopes(googleCalendarActionScopes.listCalendarSharing)
  .input(
    z.object({
      calendarId: z
        .string()
        .default('primary')
        .describe('Calendar ID. Use "primary" for the user\'s primary calendar.'),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(250)
        .optional()
        .describe('Maximum sharing rules to return on one page, from 1 to 250.'),
      pageToken: z
        .string()
        .optional()
        .describe('Page token returned by a previous list request.'),
      showDeleted: z
        .boolean()
        .optional()
        .describe('Whether to include deleted rules, which have the role "none".')
    })
  )
  .output(
    z.object({
      rules: z
        .array(
          z.object({
            ruleId: z.string().optional().describe('Sharing rule ID'),
            scopeType: z.string().optional().describe('Scope type'),
            scopeValue: z.string().optional().describe('User email, group email, or domain'),
            role: z.string().optional().describe('Access role'),
            etag: z.string().optional().describe('Sharing rule version tag')
          })
        )
        .describe('Sharing rules returned on this page'),
      nextPageToken: z.string().optional().describe('Token for the next page'),
      totalResults: z.number().describe('Number of sharing rules returned on this page')
    })
  )
  .handleInvocation(async ctx => {
    try {
      let client = new GoogleCalendarClient(ctx.auth.token);
      let result = await client.listAcl(ctx.input.calendarId, {
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken,
        showDeleted: ctx.input.showDeleted
      });
      let rules = (result.items ?? []).map(rule => ({
        ruleId: rule.id,
        scopeType: rule.scope?.type,
        scopeValue: rule.scope?.value,
        role: rule.role,
        etag: rule.etag
      }));

      return {
        output: {
          rules,
          nextPageToken: result.nextPageToken,
          totalResults: rules.length
        },
        message: `Found **${rules.length}** sharing rule(s) on calendar \`${ctx.input.calendarId}\`${result.nextPageToken ? ' (more pages available)' : ''}.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Google Calendar',
        operation: 'list calendar sharing',
        reason: 'google_calendar_api_error',
        nestedKeys: ['error', 'errors']
      });
    }
  })
  .build();
