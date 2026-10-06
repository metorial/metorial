import { isDeepStrictEqual } from 'node:util';
import { createAxios, pickDefined } from 'slates';
import {
  credential,
  inconsistent,
  invalid,
  json,
  protect,
  record,
  segment,
  text,
  upstream
} from './contracts';

type Auth = { token: string; webhooksKey?: string; serviceId?: string };
export type FieldType = 'triggers' | 'actions' | 'queries' | 'features';

export class ConnectClient {
  private http = createAxios({
    baseURL: 'https://connect.ifttt.com',
    timeout: 30000,
    maxRedirects: 0,
    maxContentLength: 4 * 1024 * 1024,
    maxBodyLength: 1024 * 1024
  });
  private auth: Auth;
  private secrets: string[];
  constructor(auth: string | Auth) {
    this.auth = typeof auth === 'string' ? { token: auth } : auth;
    this.secrets = [this.auth.token, this.auth.webhooksKey ?? ''].filter(Boolean);
  }
  private async request(
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    params?: Record<string, string>,
    data?: Record<string, unknown>,
    authenticated = true
  ) {
    const key = authenticated
      ? credential(this.auth.token, 'Platform Service Key')
      : undefined;
    protect({ url, params, data }, this.secrets);
    if (data !== undefined) json(data, 'Request payload');
    let response: { status: number; data: unknown };
    try {
      response = await this.http.request({
        method,
        url,
        params,
        data,
        headers: {
          ...(key === undefined ? {} : { 'IFTTT-Service-Key': key }),
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      });
    } catch (error) {
      return upstream(error, this.secrets);
    }
    protect(response.data, this.secrets);
    if (
      response.data &&
      typeof response.data === 'object' &&
      record(response.data).type === 'error'
    )
      inconsistent();
    if (response.status !== 200 && response.status !== 204) inconsistent();
    return response;
  }
  async getServiceInfo(userId?: string) {
    const response = await this.request(
      'GET',
      '/v2/me',
      userId === undefined ? undefined : { user_id: text(userId, 'user ID') }
    );
    const info = record(response.data);
    if (
      info.type !== 'me' ||
      typeof info.service_id !== 'string' ||
      !info.service_id.length ||
      typeof info.authentication_level !== 'string' ||
      !info.authentication_level.length ||
      (info.user_login !== undefined &&
        info.user_login !== null &&
        typeof info.user_login !== 'string') ||
      (this.auth.serviceId !== undefined && info.service_id !== this.auth.serviceId)
    )
      inconsistent();
    return info as Record<string, unknown> & {
      service_id: string;
      authentication_level: string;
      user_login?: string | null;
    };
  }
  async getConnection(connectionId: string, userId?: string) {
    const id = segment(connectionId, 'connection ID');
    const response = await this.request(
      'GET',
      `/v2/connections/${id}`,
      userId === undefined ? undefined : { user_id: text(userId, 'user ID') },
      undefined,
      userId !== undefined
    );
    const connection = record(response.data);
    if (
      connection.type !== 'connection' ||
      connection.id !== connectionId ||
      typeof connection.name !== 'string' ||
      !Array.isArray(connection.services) ||
      (connection.user_status !== undefined &&
        connection.user_status !== null &&
        typeof connection.user_status !== 'string')
    )
      inconsistent();
    return connection;
  }
  async updateUserConnection(
    connectionId: string,
    userId: string,
    configuration: Record<string, unknown>
  ) {
    const id = segment(connectionId, 'connection ID'),
      user = text(userId, 'user ID');
    if (!Array.isArray(configuration.user_features))
      invalid(
        'Provide the complete current user_features configuration for the native replacement request. Use get_connection first.'
      );
    await this.request(
      'PUT',
      `/v2/connections/${id}/user_connection`,
      { user_id: user },
      configuration
    );
    const connection = await this.getConnection(connectionId, userId);
    if (
      !connection.user_connection ||
      !Array.isArray(record(connection.user_connection).user_features)
    )
      inconsistent();
    return record(connection.user_connection);
  }
  async getFieldOptions(
    connectionId: string,
    type: FieldType,
    typeId: string,
    fieldSlug: string,
    userId?: string
  ) {
    if (userId === undefined)
      invalid(
        'Field options require the connected user ID. Provide userId from your service.'
      );
    if (!['triggers', 'queries', 'actions', 'features'].includes(type))
      invalid('Choose triggers, queries, actions or features.');
    text(fieldSlug, 'field slug');
    const response = await this.request(
      'GET',
      `/v2/connections/${segment(connectionId, 'connection ID')}/${type}/${segment(typeId, 'trigger, query, action or feature ID')}/field_options`,
      { user_id: text(userId, 'user ID') }
    );
    const native = record(response.data);
    if (native.type !== 'field_options') inconsistent();
    const options = record(native.options);
    if (!Object.hasOwn(options, fieldSlug) || !Array.isArray(options[fieldSlug]))
      inconsistent();
    const selected = options[fieldSlug] as unknown[];
    for (const option of selected) {
      const value = record(option);
      if (
        typeof value.label !== 'string' ||
        typeof value.value !== 'string' ||
        (value.group !== undefined && value.group !== null && typeof value.group !== 'string')
      )
        inconsistent();
    }
    return selected;
  }
  private executionBody(
    userId: string,
    fields?: Record<string, unknown>,
    userFeatureId?: string
  ) {
    return pickDefined({
      user_id: text(userId, 'user ID'),
      fields,
      user_feature_id:
        userFeatureId === undefined ? undefined : text(userFeatureId, 'user feature ID')
    });
  }
  async testTrigger(
    connectionId: string,
    triggerId: string,
    userId: string,
    userFeatureId?: string
  ) {
    const response = await this.request(
      'POST',
      `/v2/connections/${segment(connectionId, 'connection ID')}/triggers/${segment(triggerId, 'trigger ID')}/test`,
      undefined,
      this.executionBody(userId, undefined, userFeatureId)
    );
    if (
      response.status !== 204 ||
      (response.data !== '' && response.data !== undefined && response.data !== null)
    )
      inconsistent();
    return { accepted: true, httpStatus: 204 };
  }
  async runAction(
    connectionId: string,
    actionId: string,
    userId: string,
    fields?: Record<string, unknown>,
    userFeatureId?: string
  ) {
    const response = await this.request(
      'POST',
      `/v2/connections/${segment(connectionId, 'connection ID')}/actions/${segment(actionId, 'action ID')}/run`,
      undefined,
      this.executionBody(userId, fields, userFeatureId)
    );
    if (
      response.status !== 204 ||
      (response.data !== '' && response.data !== undefined && response.data !== null)
    )
      inconsistent();
    return { accepted: true, httpStatus: 204 };
  }
  async performQuery(
    connectionId: string,
    queryId: string,
    userId: string,
    fields?: Record<string, unknown>,
    limit?: number,
    cursor?: string,
    userFeatureId?: string
  ) {
    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1))
      invalid(
        'Query limit must be a positive safe integer. The connected service may impose a smaller limit.'
      );
    const body = {
      ...this.executionBody(userId, fields, userFeatureId),
      ...pickDefined({
        limit,
        cursor: cursor === undefined ? undefined : text(cursor, 'query cursor')
      })
    };
    const response = await this.request(
      'POST',
      `/v2/connections/${segment(connectionId, 'connection ID')}/queries/${segment(queryId, 'query ID')}/perform`,
      undefined,
      body
    );
    const native = record(response.data);
    if (native.type !== 'list' && native.type !== 'query') inconsistent();
    if (
      native.type === 'list' &&
      (!Array.isArray(native.data) || (limit !== undefined && native.data.length > limit))
    )
      inconsistent();
    if (
      native.type === 'query' &&
      (typeof native.query_id !== 'string' ||
        !native.query_id.length ||
        !native.fields ||
        typeof native.fields !== 'object' ||
        Array.isArray(native.fields))
    )
      inconsistent();
    const next =
      native.next === undefined || native.next === null ? undefined : record(native.next);
    for (const candidate of [native.cursor, next?.cursor]) {
      if (
        candidate !== undefined &&
        candidate !== null &&
        (typeof candidate !== 'string' || !candidate.length)
      )
        inconsistent();
    }
    if (native.cursor != null && next?.cursor != null && native.cursor !== next.cursor)
      inconsistent();
    const nextCursor = (next?.cursor ?? native.cursor ?? undefined) as string | undefined;
    if (next !== undefined && nextCursor === undefined) inconsistent();
    if (nextCursor !== undefined && nextCursor === cursor) inconsistent();
    const nextFields = next?.fields ?? (native.type === 'list' ? native.fields : undefined);
    if (
      nextFields !== undefined &&
      (!nextFields || typeof nextFields !== 'object' || Array.isArray(nextFields))
    )
      inconsistent();
    if (
      next?.fields !== undefined &&
      native.fields !== undefined &&
      !isDeepStrictEqual(next.fields, native.fields)
    )
      inconsistent();
    return {
      native,
      nextCursor,
      nextFields: nextFields as Record<string, unknown> | undefined
    };
  }
  async sendRealtimeNotification(
    notifications: Array<{ userId?: string; triggerIdentity?: string }>
  ) {
    if (!notifications.length || notifications.length > 1000)
      invalid('Provide 1 to 1000 notification targets.');
    const data = notifications.map(value => {
      if (value.userId === undefined && value.triggerIdentity === undefined)
        invalid('Every notification must include a nonempty userId or triggerIdentity.');
      return pickDefined({
        user_id: value.userId === undefined ? undefined : text(value.userId, 'user ID'),
        trigger_identity:
          value.triggerIdentity === undefined
            ? undefined
            : text(value.triggerIdentity, 'trigger identity')
      });
    });
    const key = credential(this.auth.token, 'Platform Service Key');
    protect(data, this.secrets);
    json(data, 'Notification payload');
    const http = createAxios({
      baseURL: 'https://realtime.ifttt.com',
      timeout: 30000,
      maxRedirects: 0,
      maxContentLength: 4 * 1024 * 1024,
      maxBodyLength: 1024 * 1024
    });
    let response: { status: number; data: unknown };
    try {
      response = await http.post(
        '/v1/notifications',
        { data },
        {
          headers: {
            'IFTTT-Service-Key': key,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );
    } catch (error) {
      return upstream(error, this.secrets);
    }
    protect(response.data, this.secrets);
    if (
      response.status < 200 ||
      response.status >= 300 ||
      (response.data &&
        typeof response.data === 'object' &&
        record(response.data).type === 'error')
    )
      inconsistent();
    return {
      accepted: true,
      httpStatus: response.status,
      response: response.data === '' || response.data == null ? null : response.data
    };
  }
}
