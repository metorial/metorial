import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPagespeedTest = SlateTool.create(spec, {
  name: 'Create Page Speed Test',
  key: 'create_pagespeed_test',
  description: `Create a new page speed monitoring check. Measures website load performance from a chosen region with configurable alert thresholds for load time and page size.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the page speed test'),
      websiteUrl: z.string().describe('URL to monitor for page speed'),
      checkRate: z
        .number()
        .describe('Check frequency in seconds (e.g. 300, 600, 1800, 3600, 86400)'),
      locationIso: z
        .string()
        .describe('Monitoring region ISO code (AU, CA, DE, FR, IN, JP, NL, SG, UK, US, USW)'),
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
        .describe('Alert if load time exceeds this value in milliseconds'),
      alertSmaller: z
        .number()
        .optional()
        .describe('Alert if page size is smaller than this value in bytes'),
      tags: z.array(z.string()).optional().describe('Tags for the test'),
      paused: z.boolean().optional().describe('Whether the test starts paused')
    })
  )
  .output(
    z.object({
      testId: z.string().describe('ID of the newly created page speed test')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      websiteUrl,
      checkRate,
      locationIso,
      contactGroups,
      alertBigger,
      alertSlower,
      alertSmaller,
      ...rest
    } = ctx.input;

    let data: Record<string, any> = {
      ...rest,
      website_url: websiteUrl,
      check_rate: checkRate,
      location_iso: locationIso
    };

    if (contactGroups) data.contact_groups = contactGroups;
    if (alertBigger !== undefined) data.alert_bigger = alertBigger;
    if (alertSlower !== undefined) data.alert_slower = alertSlower;
    if (alertSmaller !== undefined) data.alert_smaller = alertSmaller;

    let result = await client.createPagespeedTest(data);
    let testId = String(result?.data?.new_id ?? result?.new_id ?? '');

    return {
      output: { testId },
      message: `Created page speed test **${ctx.input.name}** (ID: ${testId}).`
    };
  })
  .build();
