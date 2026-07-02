import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let getUsageReports = SlateTool.create(spec, {
  name: 'Get Usage Reports',
  key: 'get_usage_reports',
  description: `Retrieve usage reports at the customer or user level. Shows application adoption, usage statistics, and account activity metrics for a specific date.`,
  instructions: [
    'Usage reports are only available for dates at least 2 days in the past.',
    'Use "all" as the userKey to get usage reports for all users.',
    'Date format is YYYY-MM-DD.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.getUsageReports)
  .input(
    z.object({
      reportType: z.enum(['customer', 'user']).describe('Type of usage report to retrieve'),
      date: z
        .string()
        .describe('Date for the report in YYYY-MM-DD format (must be at least 2 days ago)'),
      userKey: z
        .string()
        .optional()
        .describe('User email or "all" for all users (only for user reports)'),
      parameters: z
        .string()
        .optional()
        .describe('Comma-separated list of report parameters to include'),
      filters: z
        .string()
        .optional()
        .describe('Filter for user reports (e.g. "accounts:is_disabled==true")'),
      maxResults: z.number().optional().describe('Max results per page for user reports'),
      pageToken: z.string().optional()
    })
  )
  .output(
    z.object({
      usageReports: z.array(
        z.object({
          date: z.string().optional(),
          entity: z
            .object({
              customerId: z.string().optional(),
              userEmail: z.string().optional(),
              type: z.string().optional()
            })
            .optional(),
          parameters: z
            .array(
              z.object({
                name: z.string().optional(),
                stringValue: z.string().optional(),
                intValue: z.string().optional(),
                boolValue: z.boolean().optional(),
                datetimeValue: z.string().optional(),
                msgValue: z.array(z.any()).optional()
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

    let result: any;

    if (ctx.input.reportType === 'customer') {
      result = await client.getCustomerUsageReport({
        date: ctx.input.date,
        parameters: ctx.input.parameters,
        pageToken: ctx.input.pageToken
      });
    } else {
      result = await client.getUserUsageReport({
        userKey: ctx.input.userKey || 'all',
        date: ctx.input.date,
        parameters: ctx.input.parameters,
        filters: ctx.input.filters,
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken
      });
    }

    let reports = (result.usageReports || []).map((r: any) => ({
      date: r.date,
      entity: r.entity
        ? {
            customerId: r.entity.customerId,
            userEmail: r.entity.userEmail,
            type: r.entity.type
          }
        : undefined,
      parameters: (r.parameters || []).map((p: any) => ({
        name: p.name,
        stringValue: p.stringValue,
        intValue: p.intValue ? String(p.intValue) : undefined,
        boolValue: p.boolValue,
        datetimeValue: p.datetimeValue,
        msgValue: p.msgValue
      }))
    }));

    return {
      output: {
        usageReports: reports,
        nextPageToken: result.nextPageToken
      },
      message: `Retrieved **${reports.length}** ${ctx.input.reportType} usage reports for **${ctx.input.date}**.`
    };
  })
  .build();
