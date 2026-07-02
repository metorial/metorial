import {
  createDataverseClientFromContext,
  type DataversePrimitiveKeyValue,
  type DataverseRecord,
  type DataverseRecordKey,
  dataverseRecordKeyFromInput,
  dataverseValidationError
} from '@slates/microsoft-dataverse-recipes';
import { z } from 'zod';

type DynamicsDataverseContext = {
  auth?: {
    dataverseToken?: string;
    dataverseInstanceUrl?: string;
  };
  config?: {
    dataverseInstanceUrl?: string;
    dataverseApiVersion?: string;
  };
};

export let dataverseRecordSchema = z.record(z.string(), z.any());

export let dataverseAlternateKeySchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

let requireDataverseToken = (ctx: DynamicsDataverseContext) => {
  let token = ctx.auth?.dataverseToken;
  if (!token?.trim()) {
    throw dataverseValidationError(
      'Dynamics 365 Dataverse tools require dataverseToken from oauth_common, oauth_organizations, or microsoft_client_credentials auth.'
    );
  }

  return token;
};

let resolveDataverseInstanceUrl = (
  ctx: DynamicsDataverseContext,
  options: { dataverseInstanceUrl?: string } = {}
) => {
  let instanceUrl =
    options.dataverseInstanceUrl ??
    ctx.auth?.dataverseInstanceUrl ??
    ctx.config?.dataverseInstanceUrl;

  if (!instanceUrl?.trim()) {
    throw dataverseValidationError(
      'Dynamics 365 Dataverse tools require dataverseInstanceUrl in auth, config, or tool input.'
    );
  }

  return instanceUrl;
};

export let createDynamicsClient = (
  ctx: DynamicsDataverseContext,
  options: { dataverseInstanceUrl?: string } = {}
) =>
  createDataverseClientFromContext({
    auth: {
      token: requireDataverseToken(ctx),
      instanceUrl: resolveDataverseInstanceUrl(ctx, options)
    },
    config: {
      instanceUrl: ctx.config?.dataverseInstanceUrl,
      apiVersion: ctx.config?.dataverseApiVersion
    }
  });

export let recordKeyFromInput = (input: {
  recordId?: string;
  alternateKey?: Record<string, DataversePrimitiveKeyValue>;
}): DataverseRecordKey => dataverseRecordKeyFromInput(input);

export let inferBindingType = (input: {
  bindingType?: 'unbound' | 'entity' | 'collection';
  entitySetName?: string;
  recordId?: string;
}) => {
  if (input.bindingType) return input.bindingType;
  if (input.recordId) return 'entity' as const;
  if (input.entitySetName) return 'collection' as const;
  return 'unbound' as const;
};

export let inferDataverseRecordId = (
  record: DataverseRecord | undefined,
  explicitRecordId?: string
) => {
  if (explicitRecordId) return explicitRecordId;
  if (!record) return undefined;

  let odataId = record['@odata.id'];
  if (typeof odataId === 'string') {
    let match = /\(([0-9a-fA-F-]{36})\)$/.exec(odataId);
    if (match?.[1]) return match[1];
  }

  for (let [key, value] of Object.entries(record)) {
    if (
      typeof value === 'string' &&
      /^[0-9a-fA-F-]{36}$/.test(value) &&
      key.toLowerCase().endsWith('id') &&
      !key.startsWith('_') &&
      !key.includes('@')
    ) {
      return value;
    }
  }

  return undefined;
};

export let dataverseContinuation = (result: {
  nextLink?: string | null;
  count?: number;
  pagesRead?: number;
  complete?: boolean;
}) => ({
  nextLink: result.nextLink ?? null,
  count: result.count,
  pagesRead: result.pagesRead,
  complete: result.complete
});
