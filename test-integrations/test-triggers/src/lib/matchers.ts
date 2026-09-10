import type { TestAuth } from '../auth';
import type { TestConfig } from '../config';

export type TestRoutingMatcher = {
  accountId: string;
  workspaceId: string;
};

export let buildAccountRoutingMatcher = (d: {
  accountId: string;
  workspaceId: string;
}): TestRoutingMatcher => ({
  accountId: d.accountId,
  workspaceId: d.workspaceId
});

export let buildAccountRoutingMatchers = (d: {
  auth: TestAuth;
  config: TestConfig;
}): TestRoutingMatcher[] => {
  if (!d.auth.accountId || !d.config.workspaceId) return [];

  return [
    buildAccountRoutingMatcher({
      accountId: d.auth.accountId,
      workspaceId: d.config.workspaceId
    })
  ];
};
