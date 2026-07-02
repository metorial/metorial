import { MixpanelClient } from './client';
import { mixpanelServiceError } from './errors';

type MixpanelContext = {
  config: { dataResidency: string; projectId: string };
  auth: {
    serviceAccountUsername?: string;
    serviceAccountSecret?: string;
    projectToken?: string;
  };
};

let hasText = (value: string | undefined) =>
  typeof value === 'string' && value.trim().length > 0;

export let requireProjectToken = (ctx: MixpanelContext) => {
  if (!hasText(ctx.auth.projectToken)) {
    throw mixpanelServiceError(
      'This Mixpanel operation requires a project token. Authenticate with Project Token auth or include a project token in Service Account auth.'
    );
  }
};

export let requireServiceAccount = (ctx: MixpanelContext) => {
  if (!hasText(ctx.auth.serviceAccountUsername) || !hasText(ctx.auth.serviceAccountSecret)) {
    throw mixpanelServiceError(
      'This Mixpanel operation requires service account username and secret credentials.'
    );
  }
};

export let requireNonEmptyRecord = (
  value: Record<string, unknown> | undefined,
  fieldName: string
) => {
  if (!value || Object.keys(value).length === 0) {
    throw mixpanelServiceError(`${fieldName} must include at least one property.`);
  }
};

export let requireNonEmptyStringArray = (value: string[] | undefined, fieldName: string) => {
  if (!value || value.length === 0) {
    throw mixpanelServiceError(`${fieldName} must include at least one value.`);
  }
};

export let requireDateRangeOrInterval = (params: {
  fromDate?: string;
  toDate?: string;
  interval?: number;
}) => {
  let hasDateRange = hasText(params.fromDate) || hasText(params.toDate);
  let hasCompleteDateRange = hasText(params.fromDate) && hasText(params.toDate);

  if (hasDateRange && !hasCompleteDateRange) {
    throw mixpanelServiceError('Provide both fromDate and toDate, or omit both.');
  }

  if (!hasCompleteDateRange && params.interval === undefined) {
    throw mixpanelServiceError('Provide either fromDate and toDate, or interval.');
  }
};

export let createClientFromContext = (ctx: MixpanelContext): MixpanelClient => {
  return new MixpanelClient({
    serviceAccountUsername: ctx.auth.serviceAccountUsername,
    serviceAccountSecret: ctx.auth.serviceAccountSecret,
    projectToken: ctx.auth.projectToken,
    projectId: ctx.config.projectId,
    dataResidency: ctx.config.dataResidency as 'us' | 'eu' | 'in'
  });
};
