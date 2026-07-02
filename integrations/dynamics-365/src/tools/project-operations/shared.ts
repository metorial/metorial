import { createDynamicsFinOpsClient } from '@slates/dynamics-finops-recipes';
import { createDynamicsClient } from '../../lib/client';
import { projectOperationsValidationError } from './errors';

export type ProjectOperationsInvocationContext = {
  auth: {
    dataverseToken?: string;
    dataverseRefreshToken?: string;
    refreshToken?: string;
    dataverseInstanceUrl?: string;
    finOpsToken?: string;
    finOpsBaseUrl?: string;
  };
  config: {
    dataverseInstanceUrl?: string;
    dataverseApiVersion?: string;
    finOpsBaseUrl?: string;
    finOpsDefaultLegalEntity?: string;
    projectOperationsDefaultPageSize?: number;
  };
};

export let createProjectOperationsDataverseClient = (
  ctx: ProjectOperationsInvocationContext,
  input: { dataverseInstanceUrl?: string } = {}
) => createDynamicsClient(ctx, input);

export let createProjectOperationsFinOpsClient = (
  ctx: ProjectOperationsInvocationContext,
  input: {
    finOpsBaseUrl?: string;
    legalEntityId?: string;
  } = {}
) => {
  if (!ctx.auth.finOpsToken) {
    throw projectOperationsValidationError(
      'Finance handoff requires a Finance and Operations token. Reconnect with finOpsBaseUrl in auth, or use client credentials with finOpsBaseUrl.'
    );
  }

  let baseUrl = input.finOpsBaseUrl ?? ctx.auth.finOpsBaseUrl ?? ctx.config.finOpsBaseUrl;
  if (!baseUrl) {
    throw projectOperationsValidationError(
      'Finance handoff requires a Finance and Operations base URL.'
    );
  }

  return createDynamicsFinOpsClient({
    auth: {
      token: ctx.auth.finOpsToken
    },
    config: {
      baseUrl,
      defaultLegalEntity: input.legalEntityId ?? ctx.config.finOpsDefaultLegalEntity
    }
  });
};
