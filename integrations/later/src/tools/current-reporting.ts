import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  analyticsInputSchema,
  analyticsItemSchema,
  campaignSchema,
  cursorSchema,
  pageInput
} from '../lib/schemas';
import { spec } from '../spec';

export const listInstancesTool = SlateTool.create(spec, {
  key: 'list_instances',
  name: 'List Accessible Instances',
  description:
    'List instance IDs authorized for the Reporting API v2 connection. Use these IDs to scope analytics; the API does not return instance names or user identity.',
  tags: { readOnly: true },
  instructions: [
    'Requires Reporting API v2 credentials. Continue with nextCursor and the same limit until the cursor is null.'
  ]
})
  .input(z.object(pageInput))
  .output(z.object({ instanceIds: z.array(z.string()), nextCursor: cursorSchema }))
  .handleInvocation(async ctx => ({
    output: await new Client(ctx.auth).listInstances(ctx.input),
    message: 'Retrieved authorized reporting instance IDs.'
  }))
  .build();

export const listCampaignsV2Tool = SlateTool.create(spec, {
  key: 'list_campaigns_v2',
  name: 'List Campaigns v2',
  description:
    'List campaign metadata across instances authorized for Reporting API v2. Returns numeric campaign IDs, names, instance IDs and nullable publication dates.',
  tags: { readOnly: true },
  instructions: [
    'Requires Reporting API v2 credentials. This roster accepts only limit and nextCursor; it does not accept analytics filters.'
  ]
})
  .input(z.object(pageInput))
  .output(z.object({ campaigns: z.array(campaignSchema), nextCursor: cursorSchema }))
  .handleInvocation(async ctx => ({
    output: await new Client(ctx.auth).listCampaignsV2(ctx.input),
    message: 'Retrieved a page of reporting campaigns.'
  }))
  .build();

export const getAnalyticsTool = SlateTool.create(spec, {
  key: 'get_analytics',
  name: 'Get Analytics',
  description:
    'Read Reporting API v2 analytics by instance summary, time series, campaign, creator, platform, platform ROI or post. Returns requested metrics with unavailable values preserved as null.',
  tags: { readOnly: true },
  instructions: [
    'Requires Reporting API v2 credentials. Discover scope with list_instances and numeric campaign IDs with list_campaigns_v2.',
    'Provide metrics for every level except platform_roi, which returns a fixed ROI metric set under metrics.',
    'Platform and contentType are mutually exclusive. The API further restricts metrics by platform or content format.',
    'Summary does not paginate. Time series supports granularity but not sorting; missing buckets remain absent.',
    'For cursor continuation, keep dates, metrics, filters, sorting and limit unchanged. Reporting values can be revised as source data arrives.'
  ]
})
  .input(analyticsInputSchema)
  .output(z.object({ items: z.array(analyticsItemSchema), nextCursor: cursorSchema }))
  .handleInvocation(async ctx => ({
    output: await new Client(ctx.auth).getAnalytics(ctx.input),
    message: 'Retrieved reporting analytics.'
  }))
  .build();
