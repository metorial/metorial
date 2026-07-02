import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerReportingClient } from '../lib/reporting-client';
import { spec } from '../spec';

export let reportCheckIn = SlateTool.create(spec, {
  name: 'Report Check-In',
  key: 'report_check_in',
  description: `Send a check-in ping to Honeybadger to indicate that a scheduled task or cron job has run successfully. Uses the Reporting API and requires a project API key.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      checkInId: z.string().describe('Check-in ID to ping')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the check-in ping was sent')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.projectToken) {
      throw new Error(
        'A project API key is required to report check-ins. Configure it in your authentication settings.'
      );
    }
    let reportingClient = new HoneybadgerReportingClient({
      projectToken: ctx.auth.projectToken
    });
    await reportingClient.reportCheckIn(ctx.input.checkInId);

    return {
      output: { success: true },
      message: `Check-in ping sent for **${ctx.input.checkInId}**.`
    };
  })
  .build();
