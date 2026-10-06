import { Client, type Resource } from './client';
import {
  type Document,
  fail,
  id,
  type Json,
  optionalNumber,
  optionalString,
  queryFields,
  record,
  requestDocument,
  string
} from './validation';

type Context = {
  auth: { token: string; region?: unknown };
  config?: { region?: unknown };
  input: Record<string, unknown>;
};
const names: Record<string, Resource> = {
  connection: 'connections',
  flow: 'flows',
  export: 'exports',
  import: 'imports',
  integration: 'integrations',
  job: 'jobs'
};
const summary = (kind: string, doc: Document): Document => {
  const result: Document = { [`${kind}Id`]: id(doc._id) };
  for (const key of [
    'name',
    'type',
    'lastModified',
    'status',
    'startedAt',
    'endedAt',
    'createdAt'
  ])
    if (typeof doc[key] === 'string') result[key] = doc[key];
  for (const key of ['disabled', 'offline'])
    if (typeof doc[key] === 'boolean') result[key] = doc[key];
  if (typeof doc._integrationId === 'string') result.integrationId = id(doc._integrationId);
  if (typeof doc._flowId === 'string') result.flowId = id(doc._flowId);
  if (typeof doc._flowJobId === 'string') result.flowJobId = id(doc._flowJobId);
  if (typeof doc._connectionId === 'string') result.connectionId = id(doc._connectionId);
  if (typeof doc.schedule === 'string') result.schedule = doc.schedule;
  else if (doc.schedule && typeof doc.schedule === 'object')
    result.scheduleDetails = doc.schedule;
  for (const key of ['numSuccess', 'numError', 'numIgnore'])
    if (doc[key] !== undefined) {
      const n = optionalNumber(doc[key]);
      if (n === undefined) throw fail('Celigo returned an invalid job counter.');
      result[key] = n;
    }
  return result;
};
const options = (input: Record<string, unknown>) =>
  input.cloneOptions === undefined ? {} : requestDocument(input.cloneOptions, 'cloneOptions');
const requireData = (input: Record<string, unknown>, key: string) =>
  requestDocument(input[key], key);
export async function invoke(
  key: string,
  ctx: Context
): Promise<{ output: Record<string, Json | undefined>; message: string }> {
  const client = new Client(ctx.auth, ctx.config);
  const input = ctx.input;
  if (key === 'get_token_info') {
    const info = await client.tokenInfo();
    return {
      output: {
        userId: id(info._userId),
        scope: optionalString(info.scope),
        region: client.region,
        apiVersion: 'v1',
        rawTokenInfo: info
      },
      message:
        'Validated the native token owner ID. Token mode, environment and permissions are not inferred from an absent scope.'
    };
  }
  if (key.startsWith('list_') && key !== 'list_jobs') {
    const resource = key.slice(5) as Resource;
    const kind = resource.slice(0, -1);
    const params: Record<string, string | number> = {};
    if (input.limit !== undefined) {
      if (
        !Number.isSafeInteger(input.limit) ||
        Number(input.limit) < 1 ||
        Number(input.limit) > 1000
      )
        throw fail('Provide a limit between 1 and 1000.');
      params.limit = Number(input.limit);
    }
    if (input.externalId !== undefined)
      params.externalId = string(input.externalId, 'externalId');
    const page = await client.list(
      resource,
      params,
      input.nextPageUrl === undefined ? undefined : string(input.nextPageUrl)
    );
    return {
      output: {
        [resource]: page.items.map(doc => summary(kind, doc)),
        nextPageUrl: page.nextPageUrl
      },
      message: `Retrieved ${page.items.length} ${resource} on this page.${page.nextPageUrl ? ' More results are available.' : ''}`
    };
  }
  if (key === 'list_jobs') {
    const params = queryFields({
      _flowId: input.flowId === undefined ? undefined : id(input.flowId),
      _integrationId: input.integrationId === undefined ? undefined : id(input.integrationId),
      status: input.status,
      createdAt_gte: input.createdAtFrom,
      createdAt_lte: input.createdAtTo
    });
    const r = await client.request('GET', '/jobs', undefined, params, [200, 204]);
    const data = r.data === null ? [] : r.data;
    if (!Array.isArray(data)) throw fail('Celigo returned an invalid job list.');
    const docs = data.map(v => record(v));
    const ids = docs.map(v => id(v._id));
    if (new Set(ids).size !== ids.length) throw fail('Celigo returned duplicate jobs.');
    // Native job pages can pin active jobs; a timestamp boundary is advisory, not proof of a complete history.
    const last = docs.at(-1);
    let nextCreatedAtTo: string | undefined;
    if (docs.length >= 1001 && last) {
      const time =
        typeof last.createdAt === 'string' ? Date.parse(last.createdAt) : Number.NaN;
      if (!Number.isFinite(time))
        throw fail('Celigo returned an invalid pagination timestamp.');
      nextCreatedAtTo = new Date(time - 1).toISOString();
      if (params.createdAt_lte && Date.parse(params.createdAt_lte) <= time - 1)
        throw fail('Celigo job pagination made no progress.');
    }
    return {
      output: {
        jobs: docs.map(v => summary('job', v)),
        nextCreatedAtTo,
        historyComplete: false
      },
      message: `Retrieved ${docs.length} jobs. Native date paging can pin active jobs and omit records sharing a boundary timestamp; this is not an exhaustive export.`
    };
  }
  if (key === 'get_connection' || key === 'get_flow' || key === 'get_job') {
    const kind = key.slice(4);
    const target = id(input[`${kind}Id`]);
    if (kind === 'job' && input.includeErrors === true)
      throw fail(
        'The current Jobs API does not document the legacy joberrors route. Use get_flow_errors with a native flow step and flowJobId; no job error request was sent.'
      );
    const doc = await client.get(names[kind]!, target);
    const output: Record<string, Json | undefined> = {
      ...summary(kind, doc),
      [`raw${kind[0]!.toUpperCase()}${kind.slice(1)}`]: doc
    };
    if (kind === 'connection' && input.testConnection === true)
      output.pingResult = await client.ping(target);
    if (kind === 'flow') {
      output.pageGenerators = Array.isArray(doc.pageGenerators)
        ? doc.pageGenerators
        : undefined;
      output.pageProcessors = Array.isArray(doc.pageProcessors)
        ? doc.pageProcessors
        : undefined;
      if (input.includeDependencies === true)
        output.dependencies = (
          await client.request('GET', `/flows/${target}/dependencies`)
        ).data;
    }
    if (kind === 'job') output.files = Array.isArray(doc.files) ? doc.files : [];
    return { output, message: `Retrieved the exact ${kind}.` };
  }
  if (
    key === 'create_connection' ||
    key === 'update_connection' ||
    key === 'delete_connection'
  ) {
    const action = key.split('_')[0];
    const target = action === 'create' ? undefined : id(input.connectionId);
    let doc: Document;
    if (action === 'delete') {
      await client.remove('connections', target!);
      return {
        output: { connectionId: target, deleted: true },
        message:
          'The connection was soft-deleted. The recycle bin retains it for 30 days; external credentials and prior executions remain.'
      };
    }
    const data = requireData(input, 'connectionData');
    doc =
      action === 'create'
        ? await client.create('connections', data)
        : await client.update('connections', target!, data, input.replaceAll === true);
    const registrations = doc.__failedIntegrationRegistrations;
    return {
      output: {
        ...summary('connection', doc),
        rawConnection: doc,
        registrationFailures: registrations
      },
      message: registrations
        ? 'The connection exists, but one or more integration registrations failed. Reconcile them before repeating creation.'
        : `The connection was ${action === 'create' ? 'created' : 'updated'}.`
    };
  }
  if (key === 'get_flow_errors') {
    const params = queryFields({
      occurredAt_gte: input.occurredAtFrom,
      occurredAt_lte: input.occurredAtTo,
      _flowJobId: input.flowJobId === undefined ? undefined : id(input.flowJobId)
    });
    if (input.flowJobId !== undefined) {
      if (input.occurredAtFrom === undefined)
        throw fail('flowJobId filtering also requires occurredAtFrom.');
      const job = await client.get('jobs', id(input.flowJobId));
      if (job._flowId !== id(input.flowId))
        throw fail('The job does not belong to this flow.');
    }
    const page = await client.errors(
      id(input.flowId),
      id(input.processorId),
      params,
      input.nextPageUrl === undefined ? undefined : string(input.nextPageUrl)
    );
    return {
      output: {
        errors: page.errors,
        retryData: page.retryData,
        nextPageUrl: optionalString(page.nextPageURL)
      },
      message: 'Retrieved one page of open errors for the verified native flow step.'
    };
  }
  if (key === 'resolve_errors' || key === 'retry_errors') {
    const retry = key === 'retry_errors';
    const values = input[retry ? 'retryDataKeys' : 'errorIds'];
    if (!Array.isArray(values) || values.some(v => typeof v !== 'string'))
      throw fail('Provide native error IDs or retry keys.');
    const result = await client.errorAction(
      retry ? 'retry' : 'resolve',
      id(input.flowId),
      id(input.processorId),
      values as string[]
    );
    if ('job' in result) {
      const job = record(result.job);
      if (job.type !== 'retry' || job._flowId !== id(input.flowId))
        throw fail(
          'The queued retry job was not bound to this flow. Reconcile before repeating.',
          {
            outcomeUncertain: true,
            reportedJobId: job._id,
            flowId: id(input.flowId),
            processorId: id(input.processorId)
          }
        );
      return {
        output: { retried: true, jobId: id(job._id), rawResult: job },
        message:
          'A retry job was queued. Poll get_job for its outcome; records have not been confirmed successful.'
      };
    }
    return {
      output: retry ? { retried: false } : { resolved: true },
      message: retry
        ? 'No retry job was created; the keys no longer matched.'
        : 'The errors were moved to the resolved list. Records were not retried, and their history is retained.'
    };
  }
  if (key === 'manage_state') {
    const action = input.action as 'list_keys' | 'get' | 'set' | 'delete';
    const value = action === 'set' ? requireData(input, 'stateValue') : undefined;
    const output = await client.state(
      action,
      input.key === undefined ? undefined : string(input.key),
      value,
      input.resourceType === undefined ? undefined : string(input.resourceType),
      input.resourceId === undefined ? undefined : id(input.resourceId)
    );
    return {
      output,
      message:
        action === 'delete'
          ? 'The exact state key was deleted. Consuming flows and previous external effects are unchanged.'
          : `State operation ${action} completed.`
    };
  }
  if (key === 'manage_users') return manageUsers(client, input);
  if (key.startsWith('manage_')) {
    const kind = key.slice(7);
    const resource = names[kind];
    if (!resource) throw fail('Unsupported resource.');
    const action = string(input.action);
    const target = action === 'create' ? undefined : id(input[`${kind}Id`]);
    let doc: Document;
    if (action === 'delete') {
      await client.remove(resource, target!);
      return {
        output: { [`${kind}Id`]: target, deleted: true },
        message:
          'The resource was soft-deleted and remains in the recycle bin for 30 days. Jobs, external changes, copied dependencies and other referenced resources may remain.'
      };
    }
    if (action === 'get') doc = await client.get(resource, target!);
    else if (action === 'create')
      doc = await client.create(resource, requireData(input, `${kind}Data`));
    else if (action === 'update')
      doc = await client.update(
        resource,
        target!,
        requireData(input, `${kind}Data`),
        input.replaceAll === true
      );
    else if (action === 'clone') doc = await client.clone(resource, target!, options(input));
    else if (action === 'enable' || action === 'disable')
      doc = await client.toggleFlow(target!, action === 'disable');
    else if (action === 'run') {
      await client.get('flows', target!);
      const result = (
        await client.request('POST', `/flows/${target}/run`, undefined, undefined, [200], {
          flowId: target!
        })
      ).data;
      const entries = Array.isArray(result) ? result.map(record) : [record(result)];
      const jobIds: string[] = [];
      for (const entry of entries)
        if (entry._jobId !== undefined) {
          try {
            jobIds.push(id(entry._jobId, 'queued job ID'));
          } catch {
            throw fail(
              'A run may have been queued but its job IDs were not verified. Reconcile before repeating.',
              { outcomeUncertain: true, flowId: target, reportedJobIds: jobIds }
            );
          }
        }
      const partialFailure = entries.some(v => v.error !== undefined);
      if (partialFailure && !jobIds.length)
        throw fail('Celigo did not confirm a queued run. Reconcile before repeating.', {
          outcomeUncertain: true,
          flowId: target
        });
      return {
        output: {
          flowId: target,
          jobId: jobIds.length === 1 ? jobIds[0] : undefined,
          jobIds,
          queued: jobIds.length > 0,
          partialFailure,
          rawResult: result
        },
        message: partialFailure
          ? 'Some run requests failed while the returned job IDs were queued. Poll those jobs and reconcile failed entries before repeating.'
          : jobIds.length
            ? 'Celigo queued the run. Poll the returned job IDs; execution and external effects have not been confirmed.'
            : 'Celigo accepted the request but did not return a queued job ID. Do not blindly repeat it.'
      };
    } else throw fail('Unsupported action.');
    return {
      output: { ...summary(kind, doc), rawResult: doc },
      message: `The ${kind} ${action} operation completed.${action === 'clone' ? ' The returned manifest identifies all reported created resources; referenced connections may be shared.' : ''}`
    };
  }
  throw fail('Unsupported Celigo tool.');
}
async function manageUsers(
  client: Client,
  input: Record<string, unknown>
): Promise<{ output: Record<string, Json | undefined>; message: string }> {
  const action = string(input.action);
  if (action === 'list') {
    const params: Record<string, string | number> = {};
    if (input.limit !== undefined) {
      if (
        !Number.isSafeInteger(input.limit) ||
        Number(input.limit) < 1 ||
        Number(input.limit) > 1000
      )
        throw fail('Provide a limit between 1 and 1000.');
      params.limit = Number(input.limit);
    }
    const page = await client.list(
      'ashares',
      params,
      input.nextPageUrl === undefined ? undefined : string(input.nextPageUrl)
    );
    return {
      output: { users: page.items, nextPageUrl: page.nextPageUrl },
      message:
        'Listed account access records. Their _id values are access-record IDs; sharedWithUser._id is the separate user identity. The owner is not included.'
    };
  }
  if (action === 'invite') {
    const data = requireData(input, 'userData');
    const emails = Array.isArray(data.emails)
      ? data.emails
      : data.email === undefined
        ? []
        : [data.email];
    if (
      !emails.length ||
      emails.some(v => typeof v !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    )
      throw fail('Provide userData.email or userData.emails.');
    const allowed = new Set([
      'email',
      'emails',
      'accessLevel',
      'integrationAccessLevel',
      'accountSSORequired',
      'accountMFARequired',
      'allowAccessToAPIM',
      'allowToEditRetryData',
      'allowIntegrationWorkspaceCreation'
    ]);
    if (Object.keys(data).some(k => !allowed.has(k)))
      throw fail(
        'userData contains unsupported fields. Use documented access settings; names, passwords, disabled and user identity changes are not supported.'
      );
    const body: Document = {
      ...Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'email')),
      emails
    };
    const result = (
      await client.request('POST', '/invite/multiple', body, undefined, [200], {
        emails: emails as Json[]
      })
    ).data;
    if (!Array.isArray(result) || result.length !== emails.length)
      throw fail(
        'Invitation results were not bound to every requested email. Invitations may remain; reconcile before repeating.',
        { outcomeUncertain: true }
      );
    const entries = result.map(record);
    const reportedIds = entries.flatMap(entry => {
      const value =
        entry.doc && typeof entry.doc === 'object' && !Array.isArray(entry.doc)
          ? entry.doc._id
          : undefined;
      return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value) ? [id(value)] : [];
    });
    let successful: Document[];
    try {
      successful = entries.filter(v => v.statusCode === 201).map(v => record(v.doc));
      successful.forEach(v => id(v._id));
    } catch {
      throw fail(
        'Invitations may have taken effect, but their access-record receipts were not verified. Reconcile before repeating.',
        { outcomeUncertain: true, reportedAccessRecordIds: reportedIds }
      );
    }
    return {
      output: {
        userId: successful.length === 1 ? id(successful[0]!._id) : undefined,
        users: successful,
        rawResult: entries,
        partialFailure: entries.some(v => v.statusCode !== 201)
      },
      message:
        'Per-email invitation results returned. Successful invitations can send email and retain access/history; do not resend failed or ambiguous entries without reconciliation.'
    };
  }
  // No identity-ID lookup or conversion: this value must resolve directly to the native access record.
  const target = id(input.accessRecordId ?? input.userId, 'access-record ID');
  if (
    input.accessRecordId !== undefined &&
    input.userId !== undefined &&
    id(input.userId) !== target
  )
    throw fail('userId and accessRecordId must identify the same native access record.');
  const before = await client.get('ashares', target);
  if (action === 'get')
    return {
      output: { userId: target, rawResult: before },
      message:
        'Retrieved the exact account access record; userId is the access-record ID, not _sharedWithUserId.'
    };
  if (action === 'delete') {
    await client.remove('ashares', target);
    return {
      output: { userId: target, deleted: true },
      message:
        'Account access was irreversibly removed. The person, invitation email and historical activity may remain.'
    };
  }
  if (action === 'update') {
    const data = requireData(input, 'userData');
    const fields = [
      'accessLevel',
      'integrationAccessLevel',
      'accountSSORequired',
      'accountMFARequired',
      'allowAccessToAPIM',
      'allowToEditRetryData',
      'allowIntegrationWorkspaceCreation'
    ];
    if (Object.keys(data).some(k => !fields.includes(k)))
      throw fail(
        'Only documented access settings can be updated. Email, name, disabled and userType changes are not supported by this action.'
      );
    if (input.replaceAll !== true)
      throw fail(
        'Access updates replace settings. Provide all values to retain and set replaceAll to true; omitted MFA and integration grants are cleared. Production-environment permissions are required.'
      );
    await client.request('PUT', `/ashares/${target}`, data, undefined, [204], {
      accessRecordId: target
    });
    const after = await client.get('ashares', target);
    return {
      output: { userId: target, rawResult: after },
      message:
        'The native account access settings were updated. User identity was unchanged; account-enforced SSO can override a requested SSO setting.'
    };
  }
  throw fail('Unsupported user action.');
}
