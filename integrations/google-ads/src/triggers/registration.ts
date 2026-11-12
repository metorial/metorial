import { randomBytes } from 'node:crypto';
import {
  createApiServiceError,
  getApiErrorStatus,
  SlateError,
  type SlateWebhookTarget
} from 'slates';
import { z } from 'zod';
import { GoogleAdsClient } from '../lib/client';
import type { AuthOutput, ConfigOutput } from '../lib/helpers';
import { positiveGoogleAdsIdSchema } from './event-schemas';

const httpsUrlSchema = z.url().refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
});
const leadTargetSchema = z.object({
  customerId: positiveGoogleAdsIdSchema,
  assetId: positiveGoogleAdsIdSchema,
  loginCustomerId: positiveGoogleAdsIdSchema.optional()
});
export const leadRegistrationSchema = leadTargetSchema.extend({
  webhookUrl: httpsUrlSchema,
  googleSecret: z.string().min(32).max(512)
});
type LeadTarget = z.infer<typeof leadTargetSchema>;
type LeadRegistration = z.infer<typeof leadRegistrationSchema>;
type Log = { warn: (message: object) => void };

// An ownership marker keeps already registered forms in rediscovery. It is NOT
// sufficient to mutate a hook: register replaces a marked hook only when it also
// points at the receive URL being registered, and cleanup requires an exact match
// of the saved URL and random secret.
const LEAD_SECRET_PREFIX = 'gads-lead-v1-';
const ownedSecret = new RegExp(`^${LEAD_SECRET_PREFIX}[a-f0-9]{64}$`);
// The version Google's lead form sample sets:
// https://developers.google.com/google-ads/api/samples/add-lead-form-asset
const LEAD_PAYLOAD_SCHEMA_VERSION = '3';
export const MAX_DISCOVERY_CALLS = 100;
const MAX_DISCOVERY_CUSTOMERS = 200;
const MAX_DISCOVERY_TARGETS_PER_PAGE = 1000;

const deliverySchema = z
  .object({
    webhook: z
      .object({
        advertiserWebhookUrl: z.string().optional(),
        googleSecret: z.string().optional(),
        payloadSchemaVersion: z.union([z.string(), z.number()]).optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();
const assetSchema = z.object({
  resourceName: z.string(),
  id: positiveGoogleAdsIdSchema,
  name: z.string().optional(),
  type: z.literal('LEAD_FORM'),
  leadFormAsset: z.object({ deliveryMethods: z.array(deliverySchema).default([]) })
});
type DeliveryMethod = z.infer<typeof deliverySchema>;
const assetFields =
  'asset.resource_name, asset.id, asset.name, asset.type, asset.lead_form_asset.headline, asset.lead_form_asset.delivery_methods';
const workSchema = z.object({
  kind: z.enum(['customer', 'hierarchy', 'assets']),
  customerId: positiveGoogleAdsIdSchema,
  loginCustomerId: positiveGoogleAdsIdSchema.optional(),
  apiPageToken: z.string().min(1).optional()
});
const leadPageSchema = z.object({
  version: z.literal(1),
  calls: z.number().int().min(0).max(MAX_DISCOVERY_CALLS),
  pending: z.array(workSchema).max(MAX_DISCOVERY_CUSTOMERS * 2),
  seenCustomers: z.array(positiveGoogleAdsIdSchema).max(MAX_DISCOVERY_CUSTOMERS),
  partial: z.boolean()
});

const leadTargetIdentifier = (target: Pick<LeadTarget, 'customerId' | 'assetId'>) =>
  `customers/${target.customerId}/assets/${target.assetId}`;

const clientFor = (auth: AuthOutput, config: ConfigOutput, loginCustomerId?: string) =>
  new GoogleAdsClient({
    token: auth.token,
    loginCustomerId: config.loginCustomerId ?? loginCustomerId
  });
const permissionDenied = (error: unknown) =>
  [403, 404].includes(Number(getApiErrorStatus(error))) &&
  ![
    'RESOURCE_EXHAUSTED',
    'RESOURCE_TEMPORARILY_EXHAUSTED',
    'EXCESSIVE_SHORT_TERM_QUERY_RESOURCE_CONSUMPTION',
    'EXCESSIVE_LONG_TERM_QUERY_RESOURCE_CONSUMPTION'
  ].includes(String(SlateError.is(error) ? error.data.upstream?.code : undefined));

const parseAsset = (value: unknown, customerId: string) => {
  const parsed = assetSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.resourceName !== leadTargetIdentifier({ customerId, assetId: parsed.data.id })
  ) {
    throw createApiServiceError(
      'Google Ads returned an invalid lead form asset identity or delivery configuration.'
    );
  }
  return parsed.data;
};

const readLeadAsset = async (client: GoogleAdsClient, target: LeadTarget) => {
  const response = await client.search(
    target.customerId,
    `SELECT ${assetFields} FROM asset WHERE asset.resource_name = '${leadTargetIdentifier(target)}' AND asset.type = 'LEAD_FORM'`
  );
  if (response.nextPageToken || response.results?.length !== 1) {
    throw createApiServiceError(
      'The Google Ads lead form could not be confirmed. Check account access before retrying.'
    );
  }
  const asset = parseAsset(response.results[0]?.asset, target.customerId);
  if (asset.id !== target.assetId)
    throw createApiServiceError('The Google Ads lead form identity changed.');
  return asset;
};

export const listLeadTargets = async (
  auth: AuthOutput,
  config: ConfigOutput,
  pageToken: unknown,
  log: Log
) => {
  let state: z.infer<typeof leadPageSchema>;
  if (pageToken == null) {
    const resources = await clientFor(auth, config).listAccessibleCustomers();
    const parsed = z
      .array(z.string().regex(/^customers\/[1-9]\d{0,18}$/))
      .safeParse(resources);
    if (!parsed.success)
      throw createApiServiceError('Google Ads returned invalid accessible customers.');
    const roots = [
      ...new Set(parsed.data.map(resource => resource.slice('customers/'.length)))
    ];
    state = {
      version: 1,
      calls: 1,
      seenCustomers: [],
      partial: roots.length > MAX_DISCOVERY_CUSTOMERS,
      pending: roots
        .slice(0, MAX_DISCOVERY_CUSTOMERS)
        .map(customerId => ({ kind: 'customer', customerId }))
    };
  } else {
    const parsed = leadPageSchema.safeParse(pageToken);
    if (!parsed.success)
      throw createApiServiceError('The Google Ads lead form discovery page token is invalid.');
    state = parsed.data;
  }
  const targets: SlateWebhookTarget[] = [];
  const enqueueAssets = (customerId: string, loginCustomerId?: string) => {
    if (state.seenCustomers.includes(customerId)) return;
    if (state.seenCustomers.length >= MAX_DISCOVERY_CUSTOMERS) {
      state.partial = true;
      return;
    }
    state.seenCustomers.push(customerId);
    // Visit forms before consuming the budget on more root managers.
    state.pending.unshift({ kind: 'assets', customerId, loginCustomerId });
  };
  const work = state.pending.shift();
  if (work && state.calls < MAX_DISCOVERY_CALLS) {
    state.calls++;
    const client = clientFor(auth, config, work.loginCustomerId);
    try {
      if (work.kind === 'customer') {
        // ListAccessibleCustomers includes directly accessible advertisers as
        // well as managers. CustomerClient exists only for manager customers.
        const root = z
          .object({
            id: positiveGoogleAdsIdSchema,
            manager: z.boolean().default(false),
            status: z.string().min(1)
          })
          .safeParse(await client.getCustomer(work.customerId));
        if (!root.success || root.data.id !== work.customerId) {
          throw createApiServiceError(
            'Google Ads returned an invalid root customer identity.'
          );
        }
        if (root.data.status === 'ENABLED') {
          if (root.data.manager) {
            state.pending.unshift({
              kind: 'hierarchy',
              customerId: root.data.id,
              loginCustomerId: root.data.id
            });
          } else {
            enqueueAssets(root.data.id);
          }
        }
      } else {
        const response = await client.search(
          work.customerId,
          work.kind === 'hierarchy'
            ? "SELECT customer_client.id, customer_client.manager, customer_client.status FROM customer_client WHERE customer_client.manager = FALSE AND customer_client.status = 'ENABLED'"
            : `SELECT ${assetFields} FROM asset WHERE asset.type = 'LEAD_FORM'`,
          work.apiPageToken
        );
        if (!Array.isArray(response.results ?? []))
          throw createApiServiceError('Google Ads returned an invalid discovery page.');
        if (response.nextPageToken)
          state.pending.unshift({ ...work, apiPageToken: response.nextPageToken });
        if (work.kind === 'hierarchy') {
          // A manager's customer_client includes itself and ALL transitive descendants.
          // No depth filter is used, so nested managers do not hide client accounts.
          for (const row of response.results ?? []) {
            const customer = z
              .object({
                id: positiveGoogleAdsIdSchema,
                manager: z.boolean().default(false),
                status: z.literal('ENABLED')
              })
              .safeParse(row.customerClient);
            if (!customer.success)
              throw createApiServiceError(
                'Google Ads returned an invalid customer hierarchy.'
              );
            if (customer.data.manager) continue;
            enqueueAssets(customer.data.id, work.loginCustomerId);
          }
        } else {
          const seen = new Set<string>();
          for (const row of response.results ?? []) {
            const asset = parseAsset(row.asset, work.customerId);
            if (seen.has(asset.id)) continue;
            seen.add(asset.id);
            const methods = asset.leadFormAsset.deliveryMethods;
            const hooks = methods.filter(method => method.webhook !== undefined);
            if (hooks.some(method => !ownedSecret.test(method.webhook?.googleSecret ?? ''))) {
              log.warn({
                reason: 'google_ads_lead_form_webhook_occupied',
                assetId: asset.id,
                customerId: work.customerId
              });
              continue;
            }
            if (targets.length >= MAX_DISCOVERY_TARGETS_PER_PAGE) {
              state.partial = true;
              continue;
            }
            const target = {
              customerId: work.customerId,
              assetId: asset.id,
              loginCustomerId: work.loginCustomerId
            };
            targets.push({
              webhookTargetIdentifier: leadTargetIdentifier(target),
              name: asset.name || `Lead form ${asset.id} (${work.customerId})`,
              metadata: { customerId: target.customerId, formId: target.assetId },
              webhookTargetPayload: target,
              targetOwnership: 'multi_user'
            });
          }
        }
      }
    } catch (error) {
      if (!permissionDenied(error)) throw error;
      log.warn({ reason: 'google_ads_lead_form_access_denied', customerId: work.customerId });
    }
  } else if (work) state.partial = true;
  if (state.calls >= MAX_DISCOVERY_CALLS && state.pending.length) state.partial = true;
  if (state.partial)
    log.warn({ reason: 'google_ads_lead_form_discovery_limit', calls: state.calls });
  return {
    targets,
    nextPageToken: state.pending.length && state.calls < MAX_DISCOVERY_CALLS ? state : null,
    isPartial: state.partial
  };
};

const ownedBy = (method: DeliveryMethod, registration: LeadRegistration) =>
  method.webhook?.advertiserWebhookUrl === registration.webhookUrl &&
  method.webhook?.googleSecret === registration.googleSecret;

const writeDeliveryMethods = async (
  client: GoogleAdsClient,
  target: LeadTarget,
  deliveryMethods: DeliveryMethod[]
) => {
  await client.mutateAssets(target.customerId, [
    {
      update: {
        resourceName: leadTargetIdentifier(target),
        leadFormAsset: { deliveryMethods }
      },
      updateMask: 'lead_form_asset.delivery_methods'
    }
  ]);
};

const clearOwnedLeadWebhook = async (
  client: GoogleAdsClient,
  registration: LeadRegistration
) => {
  const current = await readLeadAsset(client, registration);
  const methods = current.leadFormAsset.deliveryMethods;
  if (!methods.some(method => ownedBy(method, registration))) return; // authorized read proves our configuration absent
  await writeDeliveryMethods(
    client,
    registration,
    methods.filter(method => !ownedBy(method, registration))
  );
  const readback = await readLeadAsset(client, registration);
  if (readback.leadFormAsset.deliveryMethods.some(method => ownedBy(method, registration))) {
    throw createApiServiceError(
      'Google Ads still has the owned lead webhook after cleanup. Retry cleanup.'
    );
  }
};

export const registerLeadWebhook = async (
  auth: AuthOutput,
  config: ConfigOutput,
  input: {
    webhookTargetIdentifier: string;
    webhookTargetPayload: unknown;
    webhookUrl: string;
  }
) => {
  const parsed = leadTargetSchema.safeParse(input.webhookTargetPayload);
  if (!parsed.success || input.webhookTargetIdentifier !== leadTargetIdentifier(parsed.data))
    throw createApiServiceError('The Google Ads lead form target is invalid.');
  const url = httpsUrlSchema.safeParse(input.webhookUrl);
  if (!url.success)
    throw createApiServiceError('Google Ads lead webhooks require an HTTPS receive URL.');
  const target = parsed.data;
  const client = clientFor(auth, config, target.loginCustomerId);
  const asset = await readLeadAsset(client, target);
  const previous = asset.leadFormAsset.deliveryMethods;
  const hooks = previous.filter(method => method.webhook !== undefined);
  // An earlier attempt whose result was never saved leaves our hook at this receive
  // URL with a secret no registration knows. It is replaced; any other hook is kept.
  const abandoned =
    hooks.length === 1 &&
    ownedSecret.test(hooks[0]?.webhook?.googleSecret ?? '') &&
    hooks[0]?.webhook?.advertiserWebhookUrl === url.data;
  if (hooks.length && !abandoned)
    throw createApiServiceError(
      'This Google Ads lead form already has a webhook. Its existing destination was preserved.'
    );
  const registration = {
    ...target,
    webhookUrl: url.data,
    googleSecret: `${LEAD_SECRET_PREFIX}${randomBytes(32).toString('hex')}`
  };
  const methods = [
    ...previous.filter(method => method.webhook === undefined),
    {
      webhook: {
        advertiserWebhookUrl: registration.webhookUrl,
        googleSecret: registration.googleSecret,
        payloadSchemaVersion: LEAD_PAYLOAD_SCHEMA_VERSION
      }
    }
  ];
  // Google provides no compare-and-swap/ETag for asset updates. The read above
  // refuses foreign hooks; external concurrent edits remain a provider limitation.
  try {
    await writeDeliveryMethods(client, target, methods);
    const readback = await readLeadAsset(client, target);
    const actual = readback.leadFormAsset.deliveryMethods;
    if (
      actual.length !== methods.length ||
      !actual.some(
        method =>
          ownedBy(method, registration) &&
          String(method.webhook?.payloadSchemaVersion) === LEAD_PAYLOAD_SCHEMA_VERSION
      )
    ) {
      throw createApiServiceError(
        'Google Ads did not persist the requested lead webhook configuration.'
      );
    }
  } catch (error) {
    // A timed-out mutation may have succeeded. Always inspect ownership before
    // rollback, and verify removal; never clear a different CRM's configuration.
    try {
      await clearOwnedLeadWebhook(client, registration);
    } catch {
      throw createApiServiceError(
        'Google Ads lead webhook setup failed and rollback could not be confirmed. Inspect this form before retrying.'
      );
    }
    throw error;
  }
  return {
    webhookRegistrationIdentifier: leadTargetIdentifier(target),
    webhookRegistrationPayload: registration
  };
};

export const unregisterLeadWebhook = async (
  auth: AuthOutput,
  config: ConfigOutput,
  payload: unknown
) => {
  const parsed = leadRegistrationSchema.safeParse(payload);
  if (!parsed.success)
    throw createApiServiceError('The saved Google Ads lead webhook registration is invalid.');
  const registration = parsed.data;
  // Prefer the current connection's manager route. If the creator's route is no
  // longer available, another subscriber may have direct access or another root
  // manager. Only authorized asset reads can select an alternate cleanup route.
  const initial = clientFor(auth, config, registration.loginCustomerId);
  let selected = initial;
  try {
    await readLeadAsset(initial, registration);
  } catch (error) {
    if (!permissionDenied(error)) throw error;
    const roots = await new GoogleAdsClient({ token: auth.token }).listAccessibleCustomers();
    const parsedRoots = z
      .array(z.string().regex(/^customers\/[1-9]\d{0,18}$/))
      .safeParse(roots);
    if (!parsedRoots.success)
      throw createApiServiceError('Google Ads returned invalid cleanup account routes.');
    const routes = [
      undefined,
      ...new Set(parsedRoots.data.map(resource => resource.slice('customers/'.length)))
    ];
    let found = false;
    for (const loginCustomerId of routes.slice(0, MAX_DISCOVERY_CALLS)) {
      const alternate = new GoogleAdsClient({ token: auth.token, loginCustomerId });
      try {
        await readLeadAsset(alternate, registration);
      } catch (routeError) {
        if (permissionDenied(routeError)) continue;
        throw routeError;
      }
      selected = alternate;
      found = true;
      break;
    }
    if (!found)
      throw createApiServiceError(
        'Google Ads lead webhook cleanup could not confirm account access within the discovery limit. Retry with an authorized manager connection.'
      );
  }
  await clearOwnedLeadWebhook(selected, registration);
};
