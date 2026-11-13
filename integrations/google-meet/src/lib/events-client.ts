import {
  assertNewPageToken,
  createApiServiceError,
  createAxios,
  parseWithServiceError
} from 'slates';
import { z } from 'zod';
import { googleMeetApiError } from './errors';

export const artifactEventTypes = [
  'google.workspace.meet.transcript.v2.fileGenerated',
  'google.workspace.meet.recording.v2.fileGenerated'
] as const;
export const subscriptionNameSchema = z.string().regex(/^subscriptions\/[A-Za-z0-9_-]+$/);
export const userTarget = (ownerId: string) =>
  `//cloudidentity.googleapis.com/users/${ownerId}`;

const eventsAxios = createAxios({
  baseURL: 'https://workspaceevents.googleapis.com/v1',
  timeout: 15_000
});
const identityAxios = createAxios({ baseURL: 'https://www.googleapis.com', timeout: 15_000 });
const RPC_ALREADY_EXISTS = 6;
const subscriptionSchema = z.object({
  name: subscriptionNameSchema,
  targetResource: z.string(),
  eventTypes: z.array(z.string()),
  notificationEndpoint: z.object({ pubsubTopic: z.string() }),
  authority: z.string().optional(),
  userAuthority: z.string().optional(),
  createTime: z.iso.datetime({ offset: true }),
  expireTime: z.iso.datetime({ offset: true }),
  state: z.enum(['STATE_UNSPECIFIED', 'ACTIVE', 'SUSPENDED', 'DELETED']),
  etag: z.string().min(1),
  reconciling: z.boolean().optional()
});
export type MeetSubscription = z.infer<typeof subscriptionSchema>;
const operationSchema = z.object({
  name: z
    .string()
    .regex(/^operations\/[A-Za-z0-9_./-]+$/)
    .optional(),
  done: z.boolean().optional(),
  error: z.object({ code: z.number(), message: z.string().optional() }).optional(),
  response: z.unknown().optional()
});
export class MeetEventsClient {
  private headers: Record<string, string>;
  constructor(token: string) {
    this.headers = { Authorization: `Bearer ${token}` };
  }

  private async request(operation: string, run: () => Promise<{ data: unknown }>) {
    try {
      return (await run()).data;
    } catch (error) {
      throw googleMeetApiError(error, operation);
    }
  }

  async currentUser() {
    const body = await this.request('identify event subscription owner', () =>
      identityAxios.get('/oauth2/v2/userinfo', { headers: this.headers })
    );
    return parseWithServiceError(
      z.object({ id: z.string().regex(/^\d+$/), email: z.string().optional() }),
      body,
      'Google did not return a stable account identity for meeting events.'
    );
  }

  async listSubscriptions(ownerId: string) {
    const all: MeetSubscription[] = [];
    const seen = new Set<string>();
    let pageToken: string | undefined;
    for (let page = 0; page < 100; page++) {
      const body = await this.request('list event subscriptions', () =>
        eventsAxios.get('/subscriptions', {
          headers: this.headers,
          params: {
            pageSize: 100,
            pageToken,
            filter: `( ${artifactEventTypes.map(type => `event_types:"${type}"`).join(' OR ')} ) AND target_resource="${userTarget(ownerId)}"`
          }
        })
      );
      const result = parseWithServiceError(
        z.object({
          subscriptions: z.array(subscriptionSchema).default([]),
          nextPageToken: z.string().optional()
        }),
        body,
        'Google returned an invalid event subscription list.'
      );
      all.push(...result.subscriptions);
      pageToken = result.nextPageToken;
      if (!pageToken) return all;
      assertNewPageToken(seen, pageToken, () =>
        createApiServiceError(
          'Google repeated an event subscription page token. Retry the operation.'
        )
      );
    }
    throw createApiServiceError(
      'The event subscription list exceeded its safety limit; no partial result was accepted.'
    );
  }

  async getSubscription(name: string) {
    parseWithServiceError(subscriptionNameSchema, name, 'Invalid meeting subscription name.');
    return parseWithServiceError(
      subscriptionSchema,
      await this.request('read event subscription', () =>
        eventsAxios.get(`/${name}`, { headers: this.headers })
      ),
      'Google returned an invalid event subscription.'
    );
  }

  async completeOperation(value: unknown) {
    let operation = parseWithServiceError(
      operationSchema,
      value,
      'Google returned an invalid subscription operation.'
    );
    const deadline = Date.now() + 45_000;
    for (let attempt = 0; attempt < 20; attempt++) {
      if (operation.error)
        throw createApiServiceError(
          `Google could not complete the meeting subscription operation: ${operation.error.message ?? operation.error.code}.`,
          operation.error.code === RPC_ALREADY_EXISTS ? { upstreamCode: 'ALREADY_EXISTS' } : {}
        );
      if (operation.done) return operation.response;
      if (Date.now() >= deadline) break;
      if (!operation.name || operation.name.includes('..'))
        throw createApiServiceError(
          'Google returned an unnamed pending subscription operation.'
        );
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 250));
      operation = parseWithServiceError(
        operationSchema,
        await this.request('read subscription operation', () =>
          eventsAxios.get(`/${operation.name}`, { headers: this.headers })
        ),
        'Google returned an invalid subscription operation.'
      );
    }
    throw createApiServiceError(
      'The meeting subscription operation is still pending. Retry to recover its provider state.'
    );
  }

  async createSubscription(ownerId: string, topicName: string) {
    const result = await this.completeOperation(
      await this.request('create event subscription', () =>
        eventsAxios.post(
          '/subscriptions',
          {
            targetResource: userTarget(ownerId),
            eventTypes: artifactEventTypes,
            notificationEndpoint: { pubsubTopic: topicName },
            ttl: '604800s'
          },
          { headers: this.headers }
        )
      )
    );
    return parseWithServiceError(
      subscriptionSchema,
      result,
      'Google did not return the created meeting subscription.'
    );
  }

  async renewSubscription(subscription: MeetSubscription) {
    await this.completeOperation(
      await this.request('renew event subscription', () =>
        eventsAxios.patch(
          `/${subscription.name}`,
          { ttl: '604800s', etag: subscription.etag },
          { headers: this.headers, params: { updateMask: 'ttl' } }
        )
      )
    );
    return this.getSubscription(subscription.name);
  }

  async reactivateSubscription(subscription: MeetSubscription) {
    await this.completeOperation(
      await this.request('reactivate event subscription', () =>
        eventsAxios.post(`/${subscription.name}:reactivate`, {}, { headers: this.headers })
      )
    );
    return this.getSubscription(subscription.name);
  }

  async deleteSubscription(subscription: MeetSubscription) {
    await this.completeOperation(
      await this.request('delete event subscription', () =>
        eventsAxios.delete(`/${subscription.name}`, {
          headers: this.headers,
          params: { etag: subscription.etag }
        })
      )
    );
  }
}
