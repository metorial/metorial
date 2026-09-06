export let SLACK_NO_ENTERPRISE = '$$NONE$$';

export interface SlackBotMatcherInput {
  enterpriseId?: string | null;
  teamId: string;
}

export interface SlackUserMatcherInput {
  enterpriseId?: string | null;
  teamId: string;
  userId: string;
}

export interface SlackAuthLike {
  teamId?: string;
  userId?: string;
  actorType?: 'bot' | 'user';
  enterpriseId?: string;
}

export let buildSlackBotRoutingMatcher = (input: SlackBotMatcherInput) => ({
  installType: 'bot' as const,
  enterpriseId: input.enterpriseId || SLACK_NO_ENTERPRISE,
  teamId: input.teamId
});

export let buildSlackUserRoutingMatcher = (input: SlackUserMatcherInput) => ({
  installType: 'user' as const,
  enterpriseId: input.enterpriseId || SLACK_NO_ENTERPRISE,
  teamId: input.teamId,
  userId: input.userId
});

export let buildSlackInstallRoutingMatchers = (auth: SlackAuthLike) => {
  if (!auth.teamId) return [];

  if (auth.actorType === 'user') {
    if (!auth.userId) return [];
    return [
      buildSlackUserRoutingMatcher({
        enterpriseId: auth.enterpriseId,
        teamId: auth.teamId,
        userId: auth.userId
      })
    ];
  }

  return [
    buildSlackBotRoutingMatcher({ enterpriseId: auth.enterpriseId, teamId: auth.teamId })
  ];
};
