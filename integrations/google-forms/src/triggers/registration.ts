import { createHash } from 'node:crypto';
import {
  googlePubSubRoutingKey,
  isSameGooglePubSubInfrastructure,
  parseGooglePubSubInfrastructure
} from '@slates/google-pubsub';
import {
  createApiServiceError,
  getUpstreamErrorStatus,
  parseWithServiceError,
  type SlateTriggerGroupWebhookAutoRegistrationParameters,
  type SlateWebhookTarget
} from 'slates';
import { GoogleFormsClient } from '../lib/client';
import type { GoogleForm, GoogleFormsWatch } from '../lib/types';
import {
  type FormRegistration,
  formRegistrationSchema,
  formSelectionSchema,
  formTargetSchema,
  timestampSchema,
  watchIdSchema
} from './event-schemas';

const DAY = 24 * 60 * 60 * 1000;
const RENEW_RETRY_MS = 60 * 60 * 1000;
const TARGETS_PER_PAGE = 20;
// forms.get sends only the ID, so these errors are about the ID itself.
const UNUSABLE_FORM_STATUSES = [400, 403, 404];
export const formTargetId = (ownerId: string, formId: string) => `forms:${ownerId}:${formId}`;
export const assertFormSelected = (formId: string, selection: unknown) => {
  const selected = parseWithServiceError(
    formSelectionSchema,
    selection,
    'The form selection is invalid.'
  );
  if (!selected.formIds.includes(formId))
    throw createApiServiceError('The registered form is no longer selected.', {
      reason: 'google_forms_form_not_selected'
    });
};
// Every registration of a form on one topic derives the same ID, so racing creations converge.
export const sharedWatchId = (topicName: string, formId: string) =>
  `forms-${createHash('sha256')
    .update(JSON.stringify([topicName, formId]))
    .digest('hex')
    .slice(0, 48)}`;
export const currentFormsOwner = async (client: GoogleFormsClient) => {
  const identity = await client.getCurrentUser();
  if (!identity.id)
    throw createApiServiceError('Google did not return the connected account identity.');
  return identity.id;
};
const assertOwner = async (client: GoogleFormsClient, ownerId: string) => {
  if ((await currentFormsOwner(client)) !== ownerId)
    throw createApiServiceError('The form watch belongs to a different Google account.');
};
const assertForm = async (client: GoogleFormsClient, formId: string) => {
  if ((await client.getForm(formId)).formId !== formId)
    throw createApiServiceError('The selected form identity does not match.');
};
const usableWatch = (watch: GoogleFormsWatch | undefined) => {
  if (
    !watch ||
    watch.state !== 'ACTIVE' ||
    !watchIdSchema.safeParse(watch.id).success ||
    !timestampSchema.safeParse(watch.createTime).success ||
    !timestampSchema.safeParse(watch.expireTime).success ||
    Date.parse(watch.expireTime!) <= Date.now()
  )
    return undefined;
  return { watchId: watch.id!, createdAt: watch.createTime!, expiresAt: watch.expireTime! };
};
const listResponseWatches = async (
  client: GoogleFormsClient,
  formId: string,
  topicName: string
) => {
  const watches = (await client.listWatches(formId)).filter(
    watch => watch.eventType === 'RESPONSES'
  );
  const shared = watches.filter(watch => watch.target?.topic?.topicName === topicName);
  const watch =
    shared
      .filter(candidate => usableWatch(candidate))
      .sort((a, b) => Date.parse(b.expireTime!) - Date.parse(a.expireTime!))[0] ?? shared[0];
  return { shared, watch, foreign: watches.length > shared.length };
};
const removeCreatedWatch = async (
  client: GoogleFormsClient,
  formId: string,
  topicName: string,
  watchId: string
) => {
  try {
    await client.deleteWatch(formId, watchId);
  } catch (error) {
    if (getUpstreamErrorStatus(error) !== 404) throw error;
  }
  const { shared } = await listResponseWatches(client, formId, topicName);
  if (shared.some(candidate => candidate.id === watchId))
    throw createApiServiceError(
      'The failed form watch could not be removed; cleanup remains retryable.'
    );
};
// Resolves to null when Google keeps this registration from holding a watch of its own.
const acquireWatch = async (
  client: GoogleFormsClient,
  formId: string,
  topicName: string,
  renew: boolean
) => {
  let { watch } = await listResponseWatches(client, formId, topicName);
  let changed = false;
  if (watch?.id && (renew || !usableWatch(watch))) {
    try {
      await client.renewWatch(formId, watch.id);
      changed = true;
    } catch (error) {
      // Tolerated when another registration already renewed, replaced or removed the shared watch,
      // or it expired (NOT_FOUND).
      ({ watch } = await listResponseWatches(client, formId, topicName));
      const usable = usableWatch(watch);
      const current = usable && (!renew || Date.parse(usable.expiresAt) - DAY > Date.now());
      if (!usable && getUpstreamErrorStatus(error) === 404) watch = undefined;
      else if (watch && !current) throw error;
    }
  }
  const createdId = watch ? undefined : sharedWatchId(topicName, formId);
  let created = false;
  if (createdId) {
    try {
      await client.createWatch(formId, 'RESPONSES', topicName, createdId);
      created = changed = true;
    } catch (error) {
      // A racing registration may have created the watch first. Otherwise only a "slot taken"
      // refusal (a conflict, or a 400 from a watch on another topic) leaves this one without a watch.
      const listed = await listResponseWatches(client, formId, topicName);
      watch = listed.watch;
      if (!watch) {
        const status = getUpstreamErrorStatus(error);
        if (status === 409 || (status === 400 && listed.foreign)) return null;
        throw error;
      }
    }
  }
  if (changed) ({ watch } = await listResponseWatches(client, formId, topicName));
  const usable = usableWatch(watch);
  if (usable) return { ...usable, created };
  if (created && createdId) await removeCreatedWatch(client, formId, topicName, createdId);
  throw createApiServiceError(
    'Google Forms returned an unexpected or inactive response watch.'
  );
};
const registrationId = (saved: FormRegistration) => googlePubSubRoutingKey.forms(saved.formId);
const result = (saved: FormRegistration, earliestRenewal: number) => ({
  // The watch ID changes when another registration recreates the shared watch; this does not.
  webhookRegistrationIdentifier: registrationId(saved),
  webhookRegistrationPayload: saved,
  expiresAt: saved.expiresAt,
  renewAfter: new Date(
    saved.expiresAt
      ? Math.max(earliestRenewal, Date.parse(saved.expiresAt) - DAY)
      : Date.now() + RENEW_RETRY_MS
  ).toISOString(),
  routingKeys: [googlePubSubRoutingKey.forms(saved.formId)]
});
const WATCH_HELD_ELSEWHERE = {
  message:
    'Google Forms did not allow a response watch for this form because another one in this Google Cloud project already holds it. New responses are collected by the scheduled check until the watch can be shared.',
  data: { reason: 'google_forms_watch_held_elsewhere' }
};
export const formAutoRegistration = {
  webhookTargetList: async ctx => {
    const selection = parseWithServiceError(
      formSelectionSchema,
      ctx.input.selection,
      'The form selection is invalid.'
    );
    const formIds = [...new Set(selection.formIds)];
    const offset = ctx.input.pageToken ?? 0;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset >= formIds.length)
      throw createApiServiceError('The form discovery page token is invalid.');
    const client = new GoogleFormsClient(ctx.auth.token);
    const ownerId = await currentFormsOwner(client);
    const targets: SlateWebhookTarget[] = [];
    for (const formId of formIds.slice(offset, offset + TARGETS_PER_PAGE)) {
      const payload = formTargetSchema.safeParse({ formId, ownerId });
      let form: GoogleForm | undefined;
      try {
        if (payload.success) form = await client.getForm(formId);
      } catch (error) {
        if (!UNUSABLE_FORM_STATUSES.includes(getUpstreamErrorStatus(error) ?? 0)) throw error;
        ctx.warn({
          message:
            'The selected form does not exist or the connected account cannot access it; no response watch will be registered.',
          data: { reason: 'google_forms_form_inaccessible', formId }
        });
        continue;
      }
      if (!payload.success || form?.formId !== formId) {
        ctx.warn({
          message:
            'The selected ID is not the ID of a form; no response watch will be registered.',
          data: { reason: 'google_forms_form_id_invalid', formId }
        });
        continue;
      }
      targets.push({
        webhookTargetIdentifier: formTargetId(ownerId, formId),
        name: form.info?.documentTitle || form.info?.title || formId,
        metadata: { formId },
        webhookTargetPayload: payload.data,
        targetOwnership: 'single_user'
      });
    }
    const nextOffset = offset + TARGETS_PER_PAGE;
    return { targets, nextPageToken: nextOffset < formIds.length ? nextOffset : null };
  },
  webhookRegister: async ctx => {
    const target = parseWithServiceError(
      formTargetSchema,
      ctx.input.webhookTargetPayload,
      'The form watch target is invalid.'
    );
    if (formTargetId(target.ownerId, target.formId) !== ctx.input.webhookTargetIdentifier)
      throw createApiServiceError('The form watch target identity does not match.');
    assertFormSelected(target.formId, ctx.input.selection);
    const infrastructure = parseGooglePubSubInfrastructure(
      ctx.input.infrastructure,
      'Google Forms notification delivery has not been configured for this OAuth project.'
    );
    const client = new GoogleFormsClient(ctx.auth.token);
    await assertOwner(client, target.ownerId);
    await assertForm(client, target.formId);
    const watch = await acquireWatch(client, target.formId, infrastructure.topicName, false);
    if (!watch) ctx.warn(WATCH_HELD_ELSEWHERE);
    const now = Date.now();
    return result(
      {
        ...target,
        watchId: watch?.watchId ?? null,
        // An adopted watch predates this registration, so its creation is not the baseline.
        activatedAt: watch?.created ? watch.createdAt : new Date(now).toISOString(),
        expiresAt: watch?.expiresAt ?? null,
        infrastructure
      },
      now
    );
  },
  webhookRenew: async ctx => {
    const saved = parseWithServiceError(
      formRegistrationSchema,
      ctx.input.webhookRegistrationPayload,
      'The saved form watch is invalid.'
    );
    const target = parseWithServiceError(
      formTargetSchema,
      ctx.input.webhookTargetPayload,
      'The form watch target is invalid.'
    );
    if (
      target.formId !== saved.formId ||
      target.ownerId !== saved.ownerId ||
      ctx.input.webhookTargetIdentifier !== formTargetId(saved.ownerId, saved.formId) ||
      (ctx.input.webhookRegistrationIdentifier &&
        ctx.input.webhookRegistrationIdentifier !== registrationId(saved))
    )
      throw createApiServiceError('The form watch renewal identity does not match.');
    assertFormSelected(saved.formId, ctx.input.selection);
    const infrastructure = parseGooglePubSubInfrastructure(
      ctx.input.infrastructure,
      'The form delivery infrastructure is unavailable.'
    );
    if (!isSameGooglePubSubInfrastructure(saved.infrastructure, infrastructure))
      throw createApiServiceError(
        'The form delivery infrastructure changed; the saved watch was not modified.'
      );
    const client = new GoogleFormsClient(ctx.auth.token);
    await assertOwner(client, saved.ownerId);
    await assertForm(client, saved.formId);
    // activatedAt is kept, so a recreated or newly adopted watch does not reset the baseline.
    const watch = await acquireWatch(
      client,
      saved.formId,
      saved.infrastructure.topicName,
      true
    );
    if (!watch) ctx.warn(WATCH_HELD_ELSEWHERE);
    return result(
      { ...saved, watchId: watch?.watchId ?? null, expiresAt: watch?.expiresAt ?? null },
      Date.now() + RENEW_RETRY_MS
    );
  },
  webhookUnregister: async ctx => {
    const saved = parseWithServiceError(
      formRegistrationSchema,
      ctx.input.webhookRegistrationPayload,
      'The saved form watch is invalid.'
    );
    if (
      ctx.input.webhookRegistrationIdentifier &&
      ctx.input.webhookRegistrationIdentifier !== registrationId(saved)
    )
      throw createApiServiceError('The form watch cleanup identity does not match.');
    const client = new GoogleFormsClient(ctx.auth.token);
    await assertOwner(client, saved.ownerId);
    await assertForm(client, saved.formId);
    const topicName = saved.infrastructure.topicName;
    // The saved watch ID may be stale or absent, so the topic decides what is removed.
    const { shared } = await listResponseWatches(client, saved.formId, topicName);
    if (!shared.length) return;
    for (const watch of shared) {
      if (!watch.id) continue;
      try {
        await client.deleteWatch(saved.formId, watch.id);
      } catch (error) {
        if (getUpstreamErrorStatus(error) !== 404) throw error;
      }
    }
    if ((await listResponseWatches(client, saved.formId, topicName)).shared.length)
      throw createApiServiceError(
        'Google Forms still lists the response watch after deletion.'
      );
  }
} satisfies SlateTriggerGroupWebhookAutoRegistrationParameters<{}, { token: string }>;
