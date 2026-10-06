import { createAuthenticatedAxios, pickDefined } from 'slates';
import { z } from 'zod';
import type { AuthState } from '../auth';
import { analyticsRoutes, dates, metricNames, validateAnalytics } from './analytics';
import { invalid, laterError } from './errors';
import {
  type AnalyticsInput,
  analyticsItemSchema,
  campaignSchema,
  cursorSchema
} from './schemas';

const objectSchema = z.record(z.string(), z.unknown());
const networkSchema = z.object({
  posts: z.number(),
  stories: z.number(),
  reels: z.number(),
  lives: z.number(),
  impressions: z.number(),
  engagements: z.number()
});
const legacyReportSchema = z.object({
  campaignId: z.string().optional(),
  reportingGroupId: z.string().optional(),
  entries: z.array(
    z.object({
      period: z.string(),
      contentTotals: z.number(),
      impressions: z.number(),
      engagements: z.number(),
      clicks: z.number(),
      conversions: z.number(),
      conversionValue: z.number(),
      networkBreakdown: z.record(z.string(), networkSchema)
    })
  )
});
const legacyCampaignSchema = z.object({
  campaignId: z.string(),
  title: z.string(),
  status: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string()
});
const legacyGroupSchema = z.object({
  reportingGroupId: z.string(),
  name: z.string(),
  campaignIds: z.array(z.string())
});
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw invalid(
      'Later returned an invalid reporting response. Confirm API access and version.'
    );
  return result.data;
};
const collection = (value: unknown) => (Array.isArray(value) ? value : [value]);
const query = (fields: Record<string, unknown>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const item of value) params.append(key, String(item));
    else params.set(key, String(value));
  }
  return params.toString();
};
export class Client {
  private readonly http;
  private readonly version;
  private readonly token: string;
  constructor(auth: AuthState) {
    if (
      !auth.token ||
      [...auth.token].some(
        char => /\s/.test(char) || char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127
      )
    )
      throw invalid('A valid Reporting API bearer token is required. Reconnect Later.');
    if (auth.apiVersion !== undefined && !['v1', 'v2'].includes(auth.apiVersion))
      throw invalid('Reconnect using a supported Reporting API version.');
    this.version = auth.apiVersion ?? 'v1';
    this.token = auth.token;
    this.http = createAuthenticatedAxios({
      baseURL:
        this.version === 'v2'
          ? 'https://reporting.api.later.com/v2'
          : 'https://api.mavrck.co/v1/reporting-api',
      authHeader: { value: `Bearer ${auth.token}` },
      timeout: 30000,
      maxRedirects: 0
    });
  }
  private async read(
    path: string,
    fields: Record<string, unknown>,
    version: 'v1' | 'v2'
  ): Promise<unknown> {
    if (this.version !== version)
      throw invalid(
        `This tool requires Reporting API ${version}. Reconnect using that authentication method or select tools for your connection version.`
      );
    let data: unknown;
    try {
      data = (await this.http.get(`${path}${query(fields) ? `?${query(fields)}` : ''}`)).data;
    } catch (error) {
      throw laterError(error);
    }
    if (JSON.stringify(data)?.includes(this.token))
      throw invalid('Later returned credential text in reporting data; details omitted.');
    return data;
  }
  async getInstance() {
    return parse(
      z.object({ communityId: z.string(), communityName: z.string() }),
      await this.read('/instance', {}, 'v1')
    );
  }
  async getCampaigns(input: { campaignId?: string } = {}) {
    if (input.campaignId !== undefined && !input.campaignId.trim())
      throw invalid('campaignId must not be empty.');
    const values = collection(await this.read('/campaign', pickDefined(input), 'v1')).map(
      value => parse(legacyCampaignSchema, value)
    );
    if (
      input.campaignId !== undefined &&
      values.some(value => value.campaignId !== input.campaignId)
    )
      throw invalid('Later returned campaigns outside the requested campaignId.');
    return values;
  }
  async getReportingGroups(input: { reportingGroupId?: string; campaignId?: string } = {}) {
    if (Object.values(input).some(value => value !== undefined && !value.trim()))
      throw invalid('Reporting group and campaign identifiers must not be empty.');
    const values = collection(
      await this.read('/reporting-group', pickDefined(input), 'v1')
    ).map(value => parse(legacyGroupSchema, value));
    if (
      values.some(
        value =>
          (input.reportingGroupId !== undefined &&
            value.reportingGroupId !== input.reportingGroupId) ||
          (input.campaignId !== undefined && !value.campaignIds.includes(input.campaignId))
      )
    )
      throw invalid('Later returned reporting groups outside the requested filters.');
    return values;
  }
  async getPerformanceReport(input: {
    campaignId?: string;
    reportingGroupId?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }) {
    if (Boolean(input.campaignId) === Boolean(input.reportingGroupId))
      throw invalid('Provide exactly one campaignId or reportingGroupId.');
    if (
      [input.campaignId, input.reportingGroupId].some(
        value => value !== undefined && !value.trim()
      )
    )
      throw invalid('The reporting identifier must not be empty.');
    dates(input.startDate, input.endDate);
    const report = parse(
      legacyReportSchema,
      await this.read('/report', pickDefined(input), 'v1')
    );
    if (
      (input.campaignId !== undefined &&
        report.campaignId !== undefined &&
        report.campaignId !== input.campaignId) ||
      (input.reportingGroupId !== undefined &&
        report.reportingGroupId !== undefined &&
        report.reportingGroupId !== input.reportingGroupId)
    )
      throw invalid('Later returned a report for a different requested resource.');
    return report;
  }
  private async envelope(path: string, fields: Record<string, unknown>) {
    return parse(
      z.object({ data: z.unknown(), nextCursor: cursorSchema }),
      await this.read(path, fields, 'v2')
    );
  }
  async listInstances(input: { limit?: number; nextCursor?: string }) {
    const envelope = await this.envelope('/instances', input);
    return {
      ...parse(z.object({ instanceIds: z.array(z.string().min(1)) }), envelope.data),
      nextCursor: envelope.nextCursor
    };
  }
  async listCampaignsV2(input: { limit?: number; nextCursor?: string }) {
    const envelope = await this.envelope('/campaigns', input);
    return {
      campaigns: parse(z.array(campaignSchema), envelope.data),
      nextCursor: envelope.nextCursor
    };
  }
  async getAnalytics(input: AnalyticsInput) {
    validateAnalytics(input);
    const { level, ...fields } = input;
    const envelope = await this.envelope(analyticsRoutes[level], fields);
    if (level === 'instance_summary' && envelope.nextCursor !== null)
      throw invalid('Later returned an unexpected cursor for an aggregate summary.');
    const source =
      level === 'instance_summary'
        ? [envelope.data]
        : parse(z.array(z.unknown()), envelope.data);
    const items = source.map(value => {
      const data = parse(objectSchema, value),
        metrics: Record<string, number | null> = {};
      const rawMetrics = level === 'platform_roi' ? data : parse(objectSchema, data.metrics);
      for (const name of level === 'platform_roi'
        ? metricNames.platform_roi
        : (input.metrics ?? [])) {
        if (!(name in rawMetrics))
          throw invalid('Later omitted a requested reporting metric.');
        metrics[name] = parse(z.number().nullable(), rawMetrics[name]);
      }
      const creator =
        level === 'creator'
          ? parse(
              z.object({
                creatorId: z.number().int().nullable(),
                fullName: z.string().nullable()
              }),
              data.creator
            )
          : undefined;
      const item = parse(analyticsItemSchema, {
        metrics,
        ...pickDefined({
          instanceId: data.instanceId,
          campaignId: data.campaignId,
          campaignName: data.campaignName,
          creatorId: creator ? creator.creatorId : data.creatorId,
          creatorName: creator?.fullName,
          postId: data.postId,
          contentType: data.contentType,
          postDate: data.postDate,
          startDate: data.startDate,
          endDate: data.endDate
        })
      });
      if (
        item.instanceId !== undefined &&
        input.instanceIds &&
        !input.instanceIds.includes(item.instanceId)
      )
        throw invalid('Later returned analytics outside the requested instances.');
      if (
        item.campaignId !== undefined &&
        input.campaignIds &&
        !input.campaignIds.includes(item.campaignId)
      )
        throw invalid('Later returned analytics outside the requested campaigns.');
      if (
        level === 'campaign' &&
        (item.campaignId === undefined ||
          item.campaignName === undefined ||
          item.instanceId === undefined)
      )
        throw invalid('Later omitted campaign identity in its analytics.');
      if (
        level === 'post' &&
        (item.postId === undefined ||
          item.creatorId === undefined ||
          item.campaignId === undefined ||
          item.instanceId === undefined ||
          item.contentType === undefined ||
          item.postDate === undefined)
      )
        throw invalid('Later omitted post identity in its analytics.');
      if (['platform', 'platform_roi'].includes(level) && item.contentType === undefined)
        throw invalid('Later omitted the content type in its analytics.');
      if (
        level === 'instance_timeseries' &&
        (item.startDate === undefined || item.endDate === undefined)
      )
        throw invalid('Later omitted time-series bucket dates.');
      return item;
    });
    return { items, nextCursor: envelope.nextCursor };
  }
}
