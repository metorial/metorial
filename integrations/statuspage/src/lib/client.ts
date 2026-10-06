import { setTimeout as delay } from 'node:timers/promises';
import { createApiServiceError, createAuthenticatedAxios, pickDefined } from 'slates';
import { z } from 'zod';
import {
  componentSchema,
  groupComponentIds,
  groupSchema,
  incidentSchema,
  metricSchema,
  metricsProviderSchema,
  pageSchema,
  postmortemSchema,
  subscriberSchema,
  templateSchema
} from './models';
import { pathId, requireUpdate, statuspageError, validatePagination } from './validation';

type Fields = Record<string, unknown>;
type Pagination = { limit?: number; page?: number };
export class Client {
  private api;
  private pageId?: string;
  constructor(params: { token: string; pageId?: string }) {
    if (!params.token.trim()) throw createApiServiceError('A Statuspage API key is required.');
    this.pageId = params.pageId;
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.statuspage.io/v1',
      timeout: 30_000,
      maxRedirects: 0,
      authHeader: { value: `OAuth ${params.token.trim()}` },
      headers: { Accept: 'application/json' },
      errorAdapter: statuspageError
    });
  }
  private pagePath() {
    if (!this.pageId)
      throw createApiServiceError(
        'Provide pageId or configure a default page. Use list_pages to discover accessible pages.'
      );
    return `/pages/${pathId(this.pageId, 'pageId')}`;
  }
  private parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
    const result = schema.safeParse(data);
    if (!result.success)
      throw createApiServiceError(
        'Statuspage returned an invalid response. Check the provider service before retrying.'
      );
    return result.data;
  }
  async listPages() {
    return this.parse(z.array(pageSchema), (await this.api.get('/pages')).data);
  }
  async getPage() {
    return this.parse(pageSchema, (await this.api.get(this.pagePath())).data);
  }
  async updatePage(data: Fields) {
    requireUpdate(data);
    return this.parse(
      pageSchema,
      (await this.api.patch(this.pagePath(), { page: data })).data
    );
  }
  async createComponent(data: Fields) {
    if (typeof data.name !== 'string' || !data.name.trim())
      throw createApiServiceError('name is required to create this resource.');
    return this.parse(
      componentSchema,
      (await this.api.post(`${this.pagePath()}/components`, { component: data })).data
    );
  }
  async updateComponent(id: string, data: Fields) {
    requireUpdate(data);
    if (data.group_id === null) {
      const endpoint = `${this.pagePath()}/components/${pathId(id)}`;
      const component = this.parse(componentSchema, (await this.api.get(endpoint)).data);
      if (component.group_id) {
        await delay(1100);
        const groupEndpoint = `${this.pagePath()}/component-groups/${pathId(component.group_id)}`;
        const group = this.parse(groupSchema, (await this.api.get(groupEndpoint)).data);
        await delay(1100);
        await this.api.patch(groupEndpoint, {
          component_group: {
            name: group.name,
            components: groupComponentIds(group).filter(member => member !== id)
          }
        });
      }
      await delay(1100);
      const { group_id: _groupId, ...fields } = data;
      return this.parse(
        componentSchema,
        Object.keys(fields).length
          ? (await this.api.patch(endpoint, { component: fields })).data
          : (await this.api.get(endpoint)).data
      );
    }
    return this.parse(
      componentSchema,
      (
        await this.api.patch(`${this.pagePath()}/components/${pathId(id)}`, {
          component: data
        })
      ).data
    );
  }
  async deleteComponent(id: string) {
    await this.api.delete(`${this.pagePath()}/components/${pathId(id)}`);
  }
  async getIncident(id: string) {
    return this.parse(
      incidentSchema,
      (await this.api.get(`${this.pagePath()}/incidents/${pathId(id)}`)).data
    );
  }
  async createIncident(data: Fields) {
    if (typeof data.name !== 'string' || !data.name.trim())
      throw createApiServiceError('name is required to create this resource.');
    return this.parse(
      incidentSchema,
      (await this.api.post(`${this.pagePath()}/incidents`, { incident: data })).data
    );
  }
  async updateIncident(id: string, data: Fields) {
    requireUpdate(data);
    return this.parse(
      incidentSchema,
      (await this.api.patch(`${this.pagePath()}/incidents/${pathId(id)}`, { incident: data }))
        .data
    );
  }
  async deleteIncident(id: string) {
    await this.api.delete(`${this.pagePath()}/incidents/${pathId(id)}`);
  }
  async getMetric(id: string) {
    return this.parse(
      metricSchema,
      (await this.api.get(`${this.pagePath()}/metrics/${pathId(id)}`)).data
    );
  }
  async updateMetric(id: string, data: Fields) {
    requireUpdate(data);
    return this.parse(
      metricSchema,
      (await this.api.patch(`${this.pagePath()}/metrics/${pathId(id)}`, { metric: data })).data
    );
  }
  async deleteMetric(id: string) {
    await this.api.delete(`${this.pagePath()}/metrics/${pathId(id)}`);
  }
  async getSubscriber(id: string) {
    return this.parse(
      subscriberSchema,
      (await this.api.get(`${this.pagePath()}/subscribers/${pathId(id)}`)).data
    );
  }
  async createSubscriber(data: Fields) {
    return this.parse(
      subscriberSchema,
      (await this.api.post(`${this.pagePath()}/subscribers`, { subscriber: data })).data
    );
  }
  async listComponents(params: Pagination = {}) {
    validatePagination(params);
    return this.parse(
      z.array(componentSchema),
      (
        await this.api.get(`${this.pagePath()}/components`, {
          params: pickDefined({ per_page: params.limit, page: params.page })
        })
      ).data
    );
  }
  async listComponentGroups(params: Pagination = {}) {
    validatePagination(params);
    return this.parse(
      z.array(groupSchema),
      (
        await this.api.get(`${this.pagePath()}/component-groups`, {
          params: pickDefined({ per_page: params.limit, page: params.page })
        })
      ).data
    );
  }
  async listIncidentTemplates(params: Pagination = {}) {
    validatePagination(params);
    return this.parse(
      z.array(templateSchema),
      (
        await this.api.get(`${this.pagePath()}/incident_templates`, {
          params: pickDefined({ per_page: params.limit, page: params.page })
        })
      ).data
    );
  }
  async listMetrics(params: Pagination = {}) {
    validatePagination(params);
    return this.parse(
      z.array(metricSchema),
      (
        await this.api.get(`${this.pagePath()}/metrics`, {
          params: pickDefined({ per_page: params.limit, page: params.page })
        })
      ).data
    );
  }
  async createComponentGroup(data: Fields) {
    if (typeof data.name !== 'string' || !data.name.trim())
      throw createApiServiceError('name is required to create a component group.');
    const { description, ...group } = data;
    return this.parse(
      groupSchema,
      (
        await this.api.post(
          `${this.pagePath()}/component-groups`,
          pickDefined({
            description,
            component_group: { ...group, components: data.components ?? [] }
          })
        )
      ).data
    );
  }
  async updateComponentGroup(id: string, data: Fields) {
    requireUpdate(data);
    const endpoint = `${this.pagePath()}/component-groups/${pathId(id)}`;
    const current = this.parse(groupSchema, (await this.api.get(endpoint)).data);
    // Both fields are required by the provider, even for a partial edit.
    await delay(1100);
    return this.parse(
      groupSchema,
      (
        await this.api.patch(
          endpoint,
          pickDefined({
            description: data.description,
            component_group: {
              name: data.name ?? current.name,
              components: data.components ?? groupComponentIds(current) ?? []
            }
          })
        )
      ).data
    );
  }
  async deleteComponentGroup(id: string) {
    await this.api.delete(`${this.pagePath()}/component-groups/${pathId(id)}`);
  }
  async listIncidents(params: Pagination & { query?: string; filter?: string } = {}) {
    validatePagination(params);
    const filtered = params.filter === 'unresolved' || params.filter === 'scheduled';
    if (filtered && params.query !== undefined)
      throw createApiServiceError('query is supported only with filter="all".');
    return this.parse(
      z.array(incidentSchema),
      (
        await this.api.get(
          `${this.pagePath()}/incidents${filtered ? `/${params.filter}` : ''}`,
          {
            params: pickDefined(
              filtered
                ? { per_page: params.limit, page: params.page }
                : { q: params.query, limit: params.limit, page: params.page }
            )
          }
        )
      ).data
    );
  }
  async listSubscribers(
    params: Pagination & {
      type?: string;
      state?: string;
      sortField?: string;
      sortDirection?: string;
      query?: string;
    } = {}
  ) {
    validatePagination(params, 0, params.query ? 100 : Number.MAX_SAFE_INTEGER);
    if (
      params.sortField &&
      !['primary', 'created_at', 'quarantined_at', 'relevance'].includes(params.sortField)
    )
      throw createApiServiceError(
        'sortField must be primary, created_at, quarantined_at, or relevance.'
      );
    if (params.sortField === 'relevance' && !params.query)
      throw createApiServiceError('Sorting by relevance requires query.');
    return this.parse(
      z.array(subscriberSchema),
      (
        await this.api.get(`${this.pagePath()}/subscribers`, {
          params: pickDefined({
            type: params.type,
            state: params.state,
            limit: params.limit,
            page: params.page,
            sort_field: params.sortField,
            sort_direction: params.sortDirection,
            q: params.query
          })
        })
      ).data
    );
  }
  async unsubscribeSubscriber(id: string, skipNotification?: boolean) {
    await this.api.delete(`${this.pagePath()}/subscribers/${pathId(id)}`, {
      params: pickDefined({ skip_unsubscription_notification: skipNotification })
    });
  }
  async listMetricsProviders() {
    return this.parse(
      z.array(metricsProviderSchema),
      (await this.api.get(`${this.pagePath()}/metrics_providers`)).data
    );
  }
  async createMetric(providerId: string, data: Fields) {
    return this.parse(
      metricSchema,
      (
        await this.api.post(
          `${this.pagePath()}/metrics_providers/${pathId(providerId)}/metrics`,
          { metric: data }
        )
      ).data
    );
  }
  async submitMetricData(id: string, dataPoints: { timestamp: number; value: number }[]) {
    pathId(id, 'metricId');
    if (!dataPoints.length)
      throw createApiServiceError('Provide at least one metric data point.');
    const now = Math.floor(Date.now() / 1000);
    for (const point of dataPoints)
      if (
        !Number.isInteger(point.timestamp) ||
        point.timestamp < now - 28 * 86400 ||
        point.timestamp > now ||
        !Number.isFinite(point.value)
      )
        throw createApiServiceError(
          'Metric timestamps must be whole Unix seconds within the past 28 days; values must be finite numbers.'
        );
    const response = await this.api.post(`${this.pagePath()}/metrics/data`, {
      data: { [id]: dataPoints }
    });
    if (response.status !== 202)
      throw createApiServiceError(
        'Statuspage did not confirm acceptance of the metric batch.'
      );
    const accepted = this.parse(
      z.record(z.string(), z.array(z.object({ timestamp: z.number(), value: z.number() }))),
      response.data
    );
    if (
      !accepted[id] ||
      accepted[id].length !== dataPoints.length ||
      accepted[id].some(
        (point, index) =>
          point.value !== dataPoints[index]?.value ||
          Math.abs(point.timestamp - (dataPoints[index]?.timestamp ?? 0)) > 30
      )
    )
      throw createApiServiceError(
        'Statuspage did not acknowledge all submitted metric points. Check metric data before repeating the write.'
      );
    return accepted;
  }
  async getPostmortem(id: string) {
    return this.parse(
      postmortemSchema,
      (await this.api.get(`${this.pagePath()}/incidents/${pathId(id)}/postmortem`)).data
    );
  }
  async createOrUpdatePostmortem(id: string, body: string) {
    return this.parse(
      postmortemSchema,
      (
        await this.api.put(`${this.pagePath()}/incidents/${pathId(id)}/postmortem`, {
          postmortem: { body_draft: body }
        })
      ).data
    );
  }
  async publishPostmortem(id: string, notifySubscribers: boolean, notifyTwitter: boolean) {
    return this.parse(
      postmortemSchema,
      (
        await this.api.put(`${this.pagePath()}/incidents/${pathId(id)}/postmortem/publish`, {
          postmortem: { notify_subscribers: notifySubscribers, notify_twitter: notifyTwitter }
        })
      ).data
    );
  }
  async revertPostmortem(id: string) {
    return this.parse(
      postmortemSchema,
      (await this.api.put(`${this.pagePath()}/incidents/${pathId(id)}/postmortem/revert`)).data
    );
  }
}
