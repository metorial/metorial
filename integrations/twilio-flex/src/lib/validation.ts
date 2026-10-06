import { createApiServiceError } from 'slates';

export { z } from 'zod';

export const fail = (message: string) =>
  createApiServiceError(message, { reason: 'twilio_flex_validation', parent: {} });
export function sid(value: unknown, prefix: string, label = 'SID'): string {
  if (typeof value !== 'string' || !new RegExp(`^${prefix}[0-9a-fA-F]{32}$`).test(value))
    throw fail(`${label} must be a valid ${prefix} SID.`);
  return value;
}
export function pathId(value: string): string {
  if (
    !value ||
    value.length > 256 ||
    [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
    value === '.' ||
    value === '..'
  )
    throw fail('Provide a nonempty resource identifier.');
  return encodeURIComponent(value);
}
export function objectJson(value: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw fail(`${label} must contain a valid JSON object.`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw fail(`${label} must contain a JSON object.`);
  precise(parsed);
  return parsed as Record<string, unknown>;
}
export function precise(value: unknown, depth = 0): void {
  if (depth > 30) throw fail('JSON exceeds the supported nesting depth.');
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
  )
    throw fail('A numeric value cannot be represented precisely.');
  if (value && typeof value === 'object')
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key))
        throw fail('JSON contains an unsafe property.');
      precise(item, depth + 1);
    }
}
export function reflected(value: string, secrets: readonly string[], depth = 0): boolean {
  if (secrets.some(s => s.length >= 4 && value.includes(s))) return true;
  if (depth >= 3) return false;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value && reflected(decoded, secrets, depth + 1)) return true;
  } catch {
    /* Plain text need not be percent encoded. */
  }
  for (const part of value.match(/[A-Za-z0-9+/_-]{8,}={0,2}/g) ?? []) {
    const decoded = Buffer.from(part, 'base64').toString('utf8');
    if (decoded !== part && reflected(decoded, secrets, depth + 1)) return true;
  }
  return false;
}
export function credentials(token: string, accountSid?: string) {
  if (!token || !/^[A-Za-z0-9+/]+={0,2}$/.test(token))
    throw fail('Reconnect with valid Twilio Basic credentials.');
  const decoded = Buffer.from(token, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  const username = decoded.slice(0, separator),
    secret = decoded.slice(separator + 1);
  if (
    separator < 1 ||
    !secret ||
    decoded.includes('\n') ||
    decoded.includes('\r') ||
    Buffer.from(decoded).toString('base64') !== token
  )
    throw fail('Reconnect with valid Twilio Basic credentials.');
  if (username.startsWith('AC')) {
    sid(username, 'AC', 'Account SID');
    if (accountSid && username !== accountSid)
      throw fail(
        'The stored account does not match the account credentials. Reconnect to the intended account.'
      );
  } else sid(username, 'SK', 'API Key SID');
  if (accountSid) sid(accountSid, 'AC', 'Account SID');
  return { username, secret, secrets: [token, decoded, secret] };
}
export function validateInput(key: string, input: Record<string, unknown>): void {
  precise(input);
  const prefixes: Record<string, string> = {
    workspaceSid: 'WS',
    routingWorkspaceSid: 'WS',
    routingWorkflowSid: 'WW',
    workerSid: 'WK',
    taskQueueSid: 'WQ',
    workflowSid: 'WW',
    activitySid: 'WA',
    reservationActivitySid: 'WA',
    assignmentActivitySid: 'WA',
    interactionSid: 'KD',
    channelSid: 'UO',
    flexFlowSid: 'FO',
    chatServiceSid: 'IS',
    messagingServiceSid: 'MG',
    integrationFlowSid: 'FW',
    integrationWorkspaceSid: 'WS',
    integrationWorkflowSid: 'WW',
    flowSid: 'FW',
    executionSid: 'FN',
    mediaSid: 'ME',
    roleSid: 'RL',
    interactionContextSid: 'HQ'
  };
  for (const [field, prefix] of Object.entries(prefixes))
    if (input[field] !== undefined) sid(input[field], prefix, field);
  if (input.participantSid !== undefined)
    sid(
      input.participantSid,
      key === 'manage_interaction_participants' ? 'UT' : 'MB',
      'participantSid'
    );
  if (input.taskSid !== undefined) sid(input.taskSid, 'WT', 'taskSid');
  if (input.conversationSid !== undefined) pathId(String(input.conversationSid));
  for (const field of ['attributes', 'configuration'])
    if (typeof input[field] === 'string') objectJson(input[field], field);
  if (
    input.pageSize !== undefined &&
    (!Number.isSafeInteger(input.pageSize) ||
      Number(input.pageSize) < 1 ||
      Number(input.pageSize) > (key.includes('conversation') ? 100 : 1000))
  )
    throw fail('pageSize must be an integer within this API’s documented range.');
  for (const field of [
    'priority',
    'timeout',
    'maxReservedWorkers',
    'taskReservationTimeout',
    'minutesFilter'
  ])
    if (
      input[field] !== undefined &&
      (!Number.isSafeInteger(input[field]) || Number(input[field]) < 0)
    )
      throw fail(`${field} must be a nonnegative safe integer.`);
  if (
    input.minutesFilter !== undefined &&
    (input.startDate !== undefined || input.endDate !== undefined)
  )
    throw fail('Choose minutesFilter or a startDate/endDate window, not both.');
  for (const field of ['startDate', 'endDate'])
    if (
      input[field] !== undefined &&
      (typeof input[field] !== 'string' || !Number.isFinite(Date.parse(input[field])))
    )
      throw fail(`${field} must be an ISO date-time.`);
  if (
    input.startDate &&
    input.endDate &&
    Date.parse(String(input.startDate)) > Date.parse(String(input.endDate))
  )
    throw fail('startDate must precede endDate.');
  if (
    key === 'manage_tasks' &&
    input.action === 'update' &&
    input.attributes !== undefined &&
    ['wrapping', 'completed'].includes(String(input.assignmentStatus))
  )
    throw fail(
      'Twilio requires separate requests for Attributes and a wrapping/completed status transition. Make two explicit calls; no request was sent.'
    );
  if (key === 'manage_tasks' && input.action === 'update' && input.taskQueueSid !== undefined)
    throw fail(
      'TaskQueueSid is not a documented Task update field. Route tasks using the workspace Workflow; this request was not sent.'
    );
  if (
    key === 'manage_activities' &&
    input.action === 'update' &&
    input.available !== undefined
  )
    throw fail(
      'Activity availability is fixed at creation. Create a separate activity and explicitly update workers to use it.'
    );
  if (key === 'send_conversation_message') {
    if (input.mediaContentType !== undefined)
      throw fail(
        'MediaContentType is not a documented message-create field. Supply an existing MediaSid; its upload defines the content type.'
      );
    if (input.body === undefined && input.mediaSid === undefined)
      throw fail('Provide body or an existing mediaSid to send a message.');
  }
  if (
    key === 'manage_conversation_participants' &&
    input.action === 'update' &&
    input.messagingBindingAddress !== undefined
  )
    throw fail(
      'A participant’s destination address cannot be changed by this update. Explicitly remove and add the participant instead.'
    );
  if (key === 'create_interaction') {
    if (input.interactionContextJson !== undefined)
      throw fail(
        'InteractionContext is not a documented create field. Use the optional interactionContextSid for an existing context lookup.'
      );
    if (['voice', 'custom'].includes(String(input.channelType)))
      throw fail(
        'This interaction-create contract documents messaging channel types. Use Twilio’s documented voice flow outside this tool, or a supported messaging type.'
      );
  }
}
