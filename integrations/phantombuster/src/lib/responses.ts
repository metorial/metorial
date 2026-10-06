import { createApiServiceError } from 'slates';
import { identifier, number, optionalId, type Row, text } from './client';
export const phantom = (agent: Row) => {
  if (typeof agent.name !== 'string')
    throw createApiServiceError('PhantomBuster returned a Phantom without its name.', {
      reason: 'invalid_response'
    });
  return {
    phantomId: identifier(agent.id, 'Returned Phantom ID'),
    name: agent.name,
    scriptId: optionalId(agent.scriptId),
    launchType: text(agent.launchType),
    repeatedLaunchInterval: agent.repeatedLaunchInterval ?? undefined,
    s3Folder: text(agent.s3Folder),
    orgS3Folder: text(agent.orgS3Folder),
    executionTimeLimit: number(agent.executionTimeLimit),
    lastEndMessage: text(agent.lastEndMessage),
    lastEndStatus: text(agent.lastEndStatus ?? agent.lastEndType),
    lastLaunchTimestamp: number(agent.lastLaunch ?? agent.lastLaunchTimestamp),
    argument: agent.argument ?? undefined,
    proxy: agent.proxy ?? undefined,
    notifications: agent.notifications ?? undefined,
    script: text(agent.script),
    scriptOrg: text(agent.scriptOrgName),
    branch: text(agent.branch)
  };
};
export const execution = (container: Row) => ({
  containerId: identifier(container.id, 'Returned container ID'),
  phantomId: optionalId(container.agentId),
  status: text(container.status ?? container.lastEndStatus),
  exitCode: number(container.exitCode),
  exitMessage: text(container.exitMessage ?? container.lastEndMessage),
  launchTimestamp: number(
    container.launchDate ?? container.startedAt ?? container.queueDate ?? container.queuedAt
  ),
  endTimestamp: number(container.endDate ?? container.endedAt),
  executionTime: number(container.executionTime),
  launchType: text(container.launchType)
});
