import { buildApiServiceError, createApiServiceError } from 'slates';
import type { PaginationParams } from './client';
import { eventTargetSchema } from './models';

export const ngrokError = (error: unknown, secrets: readonly string[]) =>
  buildApiServiceError(error, {
    providerLabel: 'ngrok',
    reason: 'ngrok_api_error',
    detailKeys: ['msg', 'error_code'],
    parent: {},
    extractMessage: (value, helpers) =>
      [...new Set(secrets.flatMap(secret => [secret, JSON.stringify(secret).slice(1, -1)]))]
        .filter(secret => secret.length > 0)
        .sort((a, b) => b.length - a.length)
        .reduce(
          (message, secret) => message.split(secret).join('[redacted]'),
          helpers.extractMessage(value, { detailKeys: ['msg', 'error_code'] })
        ),
    extractUpstreamCode: (value, response, helpers) => {
      if (helpers.isRecord(response?.data) && typeof response.data.error_code === 'string')
        return response.data.error_code;
      if (
        helpers.isRecord(value) &&
        helpers.isRecord(value.data) &&
        helpers.isRecord(value.data.upstream)
      )
        return typeof value.data.upstream.code === 'string'
          ? value.data.upstream.code
          : undefined;
      return undefined;
    }
  });

export const pathId = (id: string) => {
  if (!id.trim() || id !== id.trim() || id === '.' || id === '..')
    throw createApiServiceError(
      'Provide a nonempty resource ID without surrounding whitespace.'
    );
  try {
    return encodeURIComponent(id);
  } catch {
    throw createApiServiceError('The resource ID contains invalid characters.');
  }
};

export const requireUpdate = (fields: Record<string, unknown>) => {
  if (!Object.values(fields).some(value => value !== undefined))
    throw createApiServiceError('Provide at least one field to update.');
};

export const paginationQuery = (path: string, params?: PaginationParams) => {
  const query: Record<string, string> = {};
  if (params?.nextPageUri !== undefined) {
    if (
      params.beforeId !== undefined ||
      params.limit !== undefined ||
      params.filter !== undefined
    )
      throw createApiServiceError('Use nextPageUri alone, without beforeId, limit or filter.');
    let url: URL;
    try {
      url = new URL(params.nextPageUri);
    } catch {
      throw createApiServiceError(
        'nextPageUri must be the complete next page URL returned by this list tool.'
      );
    }
    if (
      url.origin !== 'https://api.ngrok.com' ||
      url.pathname !== path ||
      url.username ||
      url.password ||
      url.hash
    )
      throw createApiServiceError(
        'nextPageUri must refer to the same ngrok API list endpoint.'
      );
    for (const [key, value] of url.searchParams) {
      if (
        !['before_id', 'limit', ...(path === '/endpoints' ? ['filter'] : [])].includes(key) ||
        key in query
      )
        throw createApiServiceError('nextPageUri contains unsupported pagination parameters.');
      query[key] = value;
    }
    if (!query.before_id)
      throw createApiServiceError('nextPageUri must contain a nonempty before_id cursor.');
  } else {
    if (params?.beforeId !== undefined) {
      pathId(params.beforeId);
      query.before_id = params.beforeId;
    }
    if (params?.limit !== undefined) query.limit = String(params.limit);
    if (params?.filter !== undefined) {
      if (path !== '/endpoints' || !params.filter.trim())
        throw createApiServiceError(
          'A nonempty filter is supported only for endpoint listing.'
        );
      query.filter = params.filter;
    }
  }
  if (
    query.limit !== undefined &&
    (!/^\d+$/.test(query.limit) || Number(query.limit) < 1 || Number(query.limit) > 100)
  )
    throw createApiServiceError('limit must be a whole number from 1 to 100.');
  return query;
};

export const validateDomainCertificate = (data: {
  certificateId?: string;
  certificateManagementPolicy?: { authority: string; privateKeyType?: string } | null;
}) => {
  if (data.certificateId !== undefined && data.certificateManagementPolicy !== undefined)
    throw createApiServiceError(
      'Specify certificateId or certificateManagementPolicy, not both.'
    );
  const policy = data.certificateManagementPolicy;
  if (
    policy &&
    (policy.authority !== 'letsencrypt' ||
      (policy.privateKeyType !== undefined &&
        !['rsa', 'ecdsa'].includes(policy.privateKeyType)))
  )
    throw createApiServiceError(
      'Automatic certificate management supports letsencrypt with rsa or ecdsa keys.'
    );
};

export const validateEventTarget = (target: unknown) => {
  const result = eventTargetSchema.strict().safeParse(target);
  if (
    !result.success ||
    Object.values(result.data).filter(value => value != null).length !== 1
  )
    throw createApiServiceError(
      'target must configure exactly one supported event destination with valid fields.'
    );
  for (const value of [
    result.data.kinesis,
    result.data.firehose,
    result.data.cloudwatch_logs
  ]) {
    if (
      value &&
      (!value.auth || Number(value.auth.role != null) + Number(value.auth.creds != null) !== 1)
    )
      throw createApiServiceError(
        'An AWS destination requires exactly one auth.role or auth.creds configuration.'
      );
    if (
      value?.auth?.creds &&
      (!value.auth.creds.aws_access_key_id?.trim() ||
        !value.auth.creds.aws_secret_access_key?.trim())
    )
      throw createApiServiceError(
        'AWS credential authentication requires both access key ID and secret access key.'
      );
  }
  if (result.data.kinesis && !result.data.kinesis.stream_arn?.trim())
    throw createApiServiceError('A Kinesis target requires stream_arn.');
  if (result.data.firehose && !result.data.firehose.delivery_stream_arn?.trim())
    throw createApiServiceError('A Firehose target requires delivery_stream_arn.');
  if (result.data.cloudwatch_logs && !result.data.cloudwatch_logs.log_group_arn?.trim())
    throw createApiServiceError('A CloudWatch target requires log_group_arn.');
  if (result.data.datadog && !result.data.datadog.api_key?.trim())
    throw createApiServiceError('A Datadog target requires api_key.');
  if (
    result.data.azure_logs_ingestion &&
    !result.data.azure_logs_ingestion.client_secret?.trim()
  )
    throw createApiServiceError('An Azure Logs Ingestion target requires client_secret.');
  return result.data;
};
