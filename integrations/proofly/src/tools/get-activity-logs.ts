import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActivityLogs = SlateTool.create(spec, {
  name: 'Get Activity Logs',
  key: 'get_activity_logs',
  description: `Retrieve a chronological log of account activities such as logins and registrations, including timestamps and IP addresses.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      activities: z
        .array(
          z.object({
            activityType: z
              .string()
              .optional()
              .describe('Type of activity (e.g., login, registration)'),
            timestamp: z.string().optional().describe('When the activity occurred'),
            ipAddress: z
              .string()
              .optional()
              .describe('IP address associated with the activity')
          })
        )
        .describe('List of account activities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getActivityLogs();

    let activities = Array.isArray(data) ? data : (data.activities ?? data.logs ?? []);

    return {
      output: {
        activities: activities.map((a: any) => ({
          activityType: a.type ?? a.activityType ?? a.activity_type ?? a.action,
          timestamp: a.timestamp ?? a.createdAt ?? a.created_at ?? a.date,
          ipAddress: a.ip ?? a.ipAddress ?? a.ip_address
        }))
      },
      message: `Retrieved **${activities.length}** activity log entries.`
    };
  })
  .build();
