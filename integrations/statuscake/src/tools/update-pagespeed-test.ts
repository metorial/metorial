import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePagespeedTest = SlateTool.create(spec, {
  name: 'Update Page Speed Test',
  key: 'update_pagespeed_test',
  description: `Update an existing page speed monitoring check. Modify name, check rate, region, alert thresholds, contact groups, and other settings. Only provided fields will be updated.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the page speed test to update'),
      name: z.string().optional().describe('New name for the test'),
      checkRate: z.number().optional().describe('Check frequency in seconds'),
      locationIso: z.string().optional().describe('Monitoring region ISO code'),
      contactGroups: z
        .array(z.string())
        .optional()
        .describe('List of contact group IDs for alerts'),
      alertBigger: z
        .number()
        .optional()
        .describe('Alert if page size exceeds this value in bytes'),
      alertSlower: z
        .number()
        .optional()
        .describe('Alert if load time exceeds this value in ms'),
      alertSmaller: z
        .number()
        .optional()
        .describe('Alert if page size is smaller than this value in bytes'),
      tags: z.array(z.string()).optional().describe('Tags for the test'),
      paused: z.boolean().optional().describe('Whether the test is paused')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      testId,
      checkRate,
      locationIso,
      contactGroups,
      alertBigger,
      alertSlower,
      alertSmaller,
      ...rest
    } = ctx.input;

    let data: Record<string, any> = { ...rest };

    if (checkRate !== undefined) data.check_rate = checkRate;
    if (locationIso !== undefined) data.location_iso = locationIso;
    if (contactGroups) data.contact_groups = contactGroups;
    if (alertBigger !== undefined) data.alert_bigger = alertBigger;
    if (alertSlower !== undefined) data.alert_slower = alertSlower;
    if (alertSmaller !== undefined) data.alert_smaller = alertSmaller;

    await client.updatePagespeedTest(testId, data);

    return {
      output: { success: true },
      message: `Updated page speed test **${testId}** successfully.`
    };
  })
  .build();
