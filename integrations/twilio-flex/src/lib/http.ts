import { ServiceError } from '@lowerdeck/error';
import { createAuthenticatedAxios, getApiErrorStatus, getResponseHeaderValue } from 'slates';
import contracts from './api-contracts.json';
import { credentials, fail, objectJson, precise, reflected, sid } from './validation';

type Rule = {
  type?: string;
  enum?: string[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
};
function validateField(value: unknown, rule: Rule, field: string) {
  if (typeof value !== 'string') throw fail(`${field} must be a string form value.`);
  if (rule.enum && !rule.enum.includes(value))
    throw fail(`${field} is not a documented value.`);
  if (rule.pattern && !new RegExp(rule.pattern).test(value))
    throw fail(`${field} has an invalid identifier format.`);
  if (rule.type === 'boolean' && !['true', 'false'].includes(value))
    throw fail(`${field} must be true or false.`);
  if (
    rule.type === 'integer' &&
    (!/^-?\d+$/.test(value) ||
      !Number.isSafeInteger(Number(value)) ||
      (rule.minimum !== undefined && Number(value) < rule.minimum) ||
      (rule.maximum !== undefined && Number(value) > rule.maximum))
  )
    throw fail(`${field} must be an integer in the documented range.`);
  if (rule.minLength !== undefined && value.length < rule.minLength)
    throw fail(`${field} is too short.`);
  if (rule.maxLength !== undefined && value.length > rule.maxLength)
    throw fail(`${field} is too long.`);
}
const serviceRoots = {
  flex: 'https://flex-api.twilio.com/v1',
  taskrouter: 'https://taskrouter.twilio.com/v1/Workspaces',
  conversations: 'https://conversations.twilio.com/v1',
  studio: 'https://studio.twilio.com/v2'
};
export function createTwilioAxios(
  service: keyof typeof serviceRoots,
  token: string,
  accountSid?: string,
  pageToken?: string
) {
  const secrets = credentials(token, accountSid).secrets;
  let write = false;
  const errorAdapter = (error: unknown) => {
    if (error instanceof ServiceError) return error;
    const status = getApiErrorStatus(error);
    const hint =
      status === 401
        ? 'Reconnect with credentials for the intended US1 account.'
        : status === 403
          ? 'Check the API key’s resource/action permissions and the product entitlement.'
          : status === 404
            ? 'Check the exact resource, account and parent SIDs; no different resource was selected.'
            : status === 429
              ? 'Wait before retrying; no automatic retry was made.'
              : 'Inspect the resource state before retrying a write.';
    const safe = fail(
      `Twilio request failed${status !== undefined ? ` (HTTP ${status})` : ''}. ${hint}`
    );
    safe.data.upstreamStatus = status;
    safe.data.outcomeUncertain = write;
    return safe;
  };
  const instance = createAuthenticatedAxios({
    baseURL: serviceRoots[service],
    authHeader: { value: `Basic ${token}` },
    contentType: 'application/x-www-form-urlencoded',
    maxRedirects: 0,
    timeout: 30000,
    maxContentLength: 16 * 1024 * 1024,
    maxBodyLength: 16 * 1024 * 1024,
    errorAdapter
  });
  instance.interceptors.request.use(request => {
    const confidential = (value: unknown, depth = 0): boolean => {
      if (depth > 30) throw fail('Request content exceeds the supported nesting depth.');
      if (typeof value === 'string') return reflected(value, secrets);
      if (value && typeof value === 'object')
        return Object.entries(value).some(
          ([key, child]) => reflected(key, secrets) || confidential(child, depth + 1)
        );
      return false;
    };
    if (confidential({ path: request.url, params: request.params, data: request.data }))
      throw fail(
        'Credentials appeared in request content. Remove them before retrying; no request was sent.'
      );
    write = request.method !== 'get';
    const path = new URL(`${request.baseURL}${request.url}`).pathname;
    const contract = contracts.find(
      c =>
        c.service === service &&
        c.method === request.method &&
        new RegExp(`^${c.path.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(path)
    );
    if (!contract)
      throw fail('This resource operation is not in the documented integration contract.');
    const parts = path.split('/'),
      patterns = contract.path.split('/');
    for (let i = 0; i < parts.length; i++)
      if (patterns[i]?.startsWith('{')) {
        const value = decodeURIComponent(parts[i]!);
        if (value.includes('/') || value.includes('\\') || value === '.' || value === '..')
          throw fail('Resource identifiers must identify one path segment.');
        const parent = patterns[i - 1];
        const prefix: Record<string, string> = {
          Workspaces: 'WS',
          Workers: 'WK',
          Tasks: 'WT',
          TaskQueues: 'WQ',
          Workflows: 'WW',
          Activities: 'WA',
          FlexFlows: 'FO',
          Interactions: 'KD',
          Channels: 'UO',
          Flows: 'FW',
          Executions: 'FN',
          Participants: service === 'flex' ? 'UT' : 'MB',
          Messages: 'IM'
        };
        if (parent !== 'Conversations' && prefix[parent!])
          sid(value, prefix[parent!]!, 'Resource SID');
      }
    const query = { ...(request.params ?? {}) };
    if (pageToken !== undefined && request.method === 'get' && 'PageToken' in contract.query)
      query.PageToken = pageToken;
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      const rule = (contract.query as Record<string, Rule>)[key];
      if (!rule) throw fail(`${key} is not a documented query field for this operation.`);
      validateField(String(value), rule, key);
    }
    request.params = query;
    if (request.method === 'post') {
      const fields = Object.fromEntries(
        new URLSearchParams(typeof request.data === 'string' ? request.data : '').entries()
      );
      for (const key of contract.required)
        if (fields[key] === undefined || fields[key] === '')
          throw fail(`${key} is required for this operation.`);
      for (const [key, value] of Object.entries(fields)) {
        const rule = (contract.body as Record<string, Rule>)[key];
        if (!rule)
          throw fail(`${key} is not a documented write field. This request was not sent.`);
        validateField(value, rule, key);
        if (
          [
            'Attributes',
            'Configuration',
            'Channel',
            'Routing',
            'MediaProperties',
            'RoutingProperties',
            'Parameters'
          ].includes(key)
        )
          objectJson(value, key);
      }
    }
    return request;
  });
  instance.interceptors.response.use(
    response => {
      const path = new URL(`${response.config.baseURL}${response.config.url}`).pathname;
      const contract = contracts.find(
        c =>
          c.service === service &&
          c.method === response.config.method &&
          new RegExp(`^${c.path.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(path)
      );
      const receiptFailure = (message: string) => {
        const error = fail(message);
        error.data.outcomeUncertain = response.config.method !== 'get';
        const raw = response.data;
        if (
          raw &&
          typeof raw === 'object' &&
          typeof raw.sid === 'string' &&
          /^[A-Z]{2}[0-9a-fA-F]{32}$/.test(raw.sid)
        )
          error.data.recovery = { reportedSid: raw.sid };
        return error;
      };
      if (!contract?.status.includes(response.status))
        throw receiptFailure(
          'Twilio returned an unexpected operation status. Inspect the resource before retrying.'
        );
      for (const key of ['x-trace-id', 'x-request-id', 'twilio-request-id']) {
        const value = getResponseHeaderValue(response.headers, key);
        if (value && reflected(value, secrets))
          throw receiptFailure(
            'Twilio returned confidential credentials in response metadata. The result was withheld.'
          );
      }
      const validateGraph = (value: unknown, depth = 0): unknown => {
        if (depth > 30)
          throw receiptFailure('Twilio returned an excessively nested response.');
        if (typeof value === 'string' && reflected(value, secrets))
          throw receiptFailure(
            'Twilio returned confidential credentials in response data. The result was withheld.'
          );
        if (Array.isArray(value)) return value.map(v => validateGraph(v, depth + 1));
        if (value && typeof value === 'object')
          return Object.fromEntries(
            Object.entries(value).map(([k, v]) => {
              if (reflected(k, secrets))
                throw receiptFailure(
                  'Twilio returned confidential credentials in response data. The result was withheld.'
                );
              return [k, validateGraph(v, depth + 1)];
            })
          );
        return value;
      };
      precise(response.data);
      response.data = validateGraph(response.data);
      if (response.status === 204) return response;
      const data = response.data as Record<string, unknown>;
      if (!data || typeof data !== 'object' || Array.isArray(data))
        throw receiptFailure('Twilio returned an invalid resource receipt.');
      const rows = contract.collection ? data[contract.collection] : [data];
      if (!Array.isArray(rows))
        throw receiptFailure('Twilio returned an invalid resource page.');
      const parts = path.split('/');
      for (const row of rows) {
        if (!row || typeof row !== 'object' || Array.isArray(row))
          throw receiptFailure('Twilio returned an invalid resource record.');
        for (const [field, value] of Object.entries(row))
          if (value === null) delete row[field];
        if (accountSid && row.account_sid !== undefined && row.account_sid !== accountSid)
          throw receiptFailure('Twilio returned a resource from a different account.');
        for (const [field, collection] of [
          ['workspace_sid', 'Workspaces'],
          ['interaction_sid', 'Interactions'],
          ['channel_sid', 'Channels'],
          ['conversation_sid', 'Conversations'],
          ['flow_sid', 'Flows']
        ] as const) {
          const index = parts.indexOf(collection);
          if (
            index >= 0 &&
            parts[index + 1] &&
            row[field] !== undefined &&
            row[field] !== decodeURIComponent(parts[index + 1]!)
          )
            throw receiptFailure('Twilio returned a resource from a different parent.');
        }
        if (contract.rowFields.some(field => field === 'sid')) {
          if (
            typeof row.sid !== 'string' ||
            !new RegExp(contract.rowSidPattern ?? '^[A-Z]{2}[0-9a-fA-F]{32}$').test(row.sid)
          )
            throw receiptFailure('Twilio returned no valid resource SID.');
          if (!contract.collection && /\{[^}]+\}$/.test(contract.path)) {
            const requested = decodeURIComponent(parts.at(-1)!);
            if (/^[A-Z]{2}[0-9a-fA-F]{32}$/.test(requested) && row.sid !== requested)
              throw receiptFailure('Twilio returned a different resource SID.');
            if (
              service === 'conversations' &&
              contract.path.endsWith('Conversations/{Sid}') &&
              !/^[A-Z]{2}[0-9a-fA-F]{32}$/.test(requested) &&
              row.unique_name !== requested
            )
              throw receiptFailure('Twilio returned a different Conversation unique name.');
          }
        }
      }
      if (contract.collection) {
        const meta = data.meta as Record<string, unknown> | undefined;
        if (!meta || typeof meta !== 'object')
          throw receiptFailure('Twilio returned no pagination metadata.');
        if (meta.next_page_url !== undefined && meta.next_page_url !== null) {
          if (typeof meta.next_page_url !== 'string')
            throw receiptFailure('Twilio returned an invalid continuation URL.');
          let next: URL;
          try {
            next = new URL(meta.next_page_url);
          } catch {
            throw receiptFailure('Twilio returned an invalid continuation URL.');
          }
          const root = new URL(serviceRoots[service]);
          if (
            next.origin !== root.origin ||
            next.pathname !== path ||
            next.username ||
            next.password ||
            next.hash
          )
            throw receiptFailure('Twilio returned a continuation for a different resource.');
          const token = next.searchParams.get('PageToken');
          if (!token || token === pageToken)
            throw receiptFailure('Twilio returned a nonprogressing continuation.');
          data.nextPageToken = token;
        }
        data.hasMore = data.nextPageToken !== undefined;
      }
      return response;
    },
    error => Promise.reject(errorAdapter(error))
  );
  return instance;
}
