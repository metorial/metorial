import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  pickDefined
} from 'slates';

export type Row = Record<string, unknown>;
export function requireValue(value: unknown, message: string): asserts value {
  if (!value) throw createApiServiceError(message, { reason: 'twitch_validation' });
}
export function upstream(error: unknown, operation: string) {
  if (error instanceof ServiceError) return error;
  const candidate = getApiErrorStatus(error);
  const status =
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    candidate >= 100 &&
    candidate <= 599
      ? candidate
      : undefined;
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Twitch',
      reason: 'twitch_api_error',
      operation,
      parent: {},
      formatMessage: () =>
        'Twitch could not verify the request. Check token validity, granted scopes and channel permissions. Reconcile uncertain writes before retrying.'
    }
  );
}
export function credential(value: unknown, label = 'access token'): string {
  requireValue(
    typeof value === 'string' &&
      value.length > 0 &&
      value.length <= 8192 &&
      [...value].every(c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126),
    `A valid Twitch ${label} is required. Reconnect the account.`
  );
  return value;
}
export function safeJson(value: unknown, secrets: readonly string[] = []) {
  const needles = secrets
    .filter(Boolean)
    .flatMap(secret => [
      secret,
      encodeURIComponent(secret),
      encodeURIComponent(encodeURIComponent(secret)),
      Buffer.from(secret).toString('base64'),
      Buffer.from(secret).toString('base64url'),
      [...secret].map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join('')
    ]);
  const ancestors = new Set<object>();
  let count = 0;
  function visit(item: unknown, depth = 0) {
    requireValue(
      ++count <= 20000 && depth < 30,
      'Twitch response exceeded the supported structure limit.'
    );
    if (typeof item === 'string') {
      let variants = [item];
      for (let round = 0; round < 2; round++) {
        const next: string[] = [];
        for (const variant of variants) {
          requireValue(
            !needles.some(n => n.length > 0 && variant.includes(n)),
            'Twitch returned credential-bearing data; the result was withheld.'
          );
          next.push(
            variant.replace(/%([0-9a-f]{2})/gi, (_match, hex: string) =>
              String.fromCharCode(Number.parseInt(hex, 16))
            ),
            variant.replace(/\\u([0-9a-f]{4})/gi, (_match, hex: string) =>
              String.fromCharCode(Number.parseInt(hex, 16))
            )
          );
          for (const candidate of variant.match(/[A-Za-z0-9+/_-]{16,}={0,2}/g) ?? [])
            if (candidate.length <= 16384)
              next.push(Buffer.from(candidate, 'base64').toString('utf8'));
        }
        variants = next;
      }
      requireValue(
        !variants.some(variant => needles.some(n => n.length > 0 && variant.includes(n))),
        'Twitch returned credential-bearing data; the result was withheld.'
      );
      for (let i = 0; i < item.length; i++) {
        const code = item.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff) {
          const next = item.charCodeAt(++i);
          requireValue(
            next >= 0xdc00 && next <= 0xdfff,
            'Twitch text contains invalid Unicode.'
          );
        } else
          requireValue(
            !(code >= 0xdc00 && code <= 0xdfff),
            'Twitch text contains invalid Unicode.'
          );
      }
    } else if (typeof item === 'number')
      requireValue(
        Number.isFinite(item) && (!Number.isInteger(item) || Number.isSafeInteger(item)),
        'Twitch returned an unsafe numeric value.'
      );
    else if (item && typeof item === 'object') {
      requireValue(!ancestors.has(item), 'Twitch data contains a circular value.');
      ancestors.add(item);
      requireValue(
        Array.isArray(item) ||
          Object.getPrototypeOf(item) === Object.prototype ||
          Object.getPrototypeOf(item) === null,
        'Twitch data must be plain JSON.'
      );
      for (const [key, child] of Object.entries(item)) {
        visit(key, depth + 1);
        visit(child, depth + 1);
      }
      ancestors.delete(item);
    } else
      requireValue(
        item === null || item === undefined || typeof item === 'boolean',
        'Twitch returned an unsupported value.'
      );
  }
  visit(value);
}
export function numericId(value: unknown): string {
  requireValue(
    typeof value === 'string' && /^[1-9][0-9]{0,29}$/.test(value),
    'Use the exact Twitch numeric ID returned by get_user_info or search.'
  );
  return value;
}
export function opaqueId(value: unknown): string {
  requireValue(
    typeof value === 'string' &&
      value.length > 0 &&
      value.length <= 256 &&
      /^[A-Za-z0-9_-]+$/.test(value),
    'Use the exact Twitch resource ID returned by a discovery tool.'
  );
  return value;
}
function integer(value: unknown, min: number, max: number, name: string) {
  requireValue(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max,
    `${name} must be an integer from ${min} to ${max}.`
  );
}
function fields(input: Row, allowed: string[]) {
  requireValue(
    Object.keys(pickDefined(input)).every(key => allowed.includes(key)),
    'Some fields do not apply to this Twitch action. Remove them rather than silently ignoring them.'
  );
}
function timestamp(value: unknown) {
  requireValue(
    typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
      Number.isFinite(Date.parse(value)),
    'Use a valid RFC3339 timestamp with a timezone.'
  );
  const year = Number(value.slice(0, 4)),
    month = Number(value.slice(5, 7)),
    day = Number(value.slice(8, 10));
  requireValue(
    month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= new Date(Date.UTC(year, month, 0)).getUTCDate(),
    'The RFC3339 calendar date is invalid.'
  );
}
export function validateInput(key: string, input: Row, secrets: readonly string[]) {
  safeJson(input, secrets);
  const opaque = new Set([
    'rewardId',
    'pollId',
    'predictionId',
    'winningOutcomeId',
    'messageId',
    'replyToMessageId',
    'clipId'
  ]);
  for (const [name, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (name.endsWith('Id')) {
      if (name === 'gameId' && (value === '' || value === '0') && key === 'update_channel')
        continue;
      (opaque.has(name) ? opaqueId : numericId)(value);
    }
    if (name.endsWith('Ids')) {
      requireValue(
        Array.isArray(value) &&
          value.length >= (name === 'redemptionIds' || name === 'broadcasterIds' ? 1 : 0) &&
          value.length <= (name === 'redemptionIds' ? 50 : 100),
        `${name} must contain a supported ID list.`
      );
      for (const id of value)
        (name === 'clipIds' || name === 'redemptionIds' ? opaqueId : numericId)(id);
    }
  }
  if (input.maxResults !== undefined)
    integer(
      input.maxResults,
      1,
      ['manage_polls', 'manage_predictions'].includes(key)
        ? 20
        : key === 'manage_channel_points' && input.action === 'get_redemptions'
          ? 50
          : 100,
      'maxResults'
    );
  if (input.cursor !== undefined)
    requireValue(
      typeof input.cursor === 'string' && input.cursor.length <= 4096,
      'Use the exact native pagination cursor.'
    );
  for (const field of ['startedAt', 'endedAt'])
    if (input[field] !== undefined) timestamp(input[field]);
  if (input.startedAt !== undefined && input.endedAt !== undefined)
    requireValue(
      Date.parse(String(input.startedAt)) < Date.parse(String(input.endedAt)),
      'startedAt must precede endedAt.'
    );
  for (const name of ['logins', 'userLogins'])
    if (input[name] !== undefined) {
      const values = input[name];
      requireValue(
        Array.isArray(values) && values.length <= 100,
        `${name} must contain at most 100 login names.`
      );
      for (const login of values)
        requireValue(
          typeof login === 'string' && /^[A-Za-z0-9_]{1,25}$/.test(login),
          'Use a Twitch login name, not a display name.'
        );
    }
  switch (key) {
    case 'get_channel_info':
      requireValue(
        Array.isArray(input.broadcasterIds) && input.broadcasterIds.length > 0,
        'Provide broadcasterIds. Discover them with get_user_info.'
      );
      break;
    case 'get_user_info':
      requireValue(
        (Array.isArray(input.userIds) ? input.userIds.length : 0) +
          (Array.isArray(input.logins) ? input.logins.length : 0) <=
          100,
        'Use at most 100 combined user IDs and login names.'
      );
      break;
    case 'update_channel':
      requireValue(
        Object.keys(pickDefined(input)).length > 1,
        'Provide at least one channel field to update.'
      );
      if (input.title !== undefined)
        requireValue(
          typeof input.title === 'string' &&
            input.title.length > 0 &&
            [...input.title].length <= 140,
          'title must contain 1-140 characters.'
        );
      if (input.delay !== undefined) integer(input.delay, 0, 900, 'delay');
      if (input.tags !== undefined) {
        requireValue(
          Array.isArray(input.tags) && input.tags.length <= 10,
          'Use at most 10 tags.'
        );
        for (const tag of input.tags)
          requireValue(
            typeof tag === 'string' && /^[\p{L}\p{N}]{1,25}$/u.test(tag),
            'Each tag must contain 1-25 letters or numbers.'
          );
      }
      break;
    case 'manage_clips':
      if (input.action === 'create') fields(input, ['action', 'broadcasterId', 'hasDelay']);
      else {
        fields(input, [
          'action',
          'broadcasterId',
          'gameId',
          'clipIds',
          'maxResults',
          'startedAt',
          'endedAt',
          'cursor'
        ]);
        requireValue(
          [input.broadcasterId, input.gameId, input.clipIds].filter(v => v !== undefined)
            .length === 1,
          'Choose exactly one clip selector: broadcasterId, gameId or clipIds.'
        );
        if (input.clipIds !== undefined) {
          requireValue(
            Array.isArray(input.clipIds) && input.clipIds.length > 0,
            'Provide at least one clip ID.'
          );
          fields(input, ['action', 'clipIds']);
        }
      }
      break;
    case 'get_videos':
      requireValue(
        [input.videoIds, input.userId, input.gameId].filter(v => v !== undefined).length === 1,
        'Choose exactly one video selector: videoIds, userId or gameId.'
      );
      if (input.videoIds !== undefined) {
        requireValue(
          Array.isArray(input.videoIds) && input.videoIds.length > 0,
          'Provide at least one video ID.'
        );
        fields(input, ['videoIds']);
      }
      break;
    case 'search':
      requireValue(
        typeof input.query === 'string' && input.query.trim().length > 0,
        'Provide a nonempty search query.'
      );
      if (input.type === 'categories')
        fields(input, ['query', 'type', 'maxResults', 'cursor']);
      break;
    case 'send_chat_message':
      requireValue(
        typeof input.message === 'string' &&
          input.message.length > 0 &&
          [...input.message].length <= 500,
        'message must contain 1-500 characters.'
      );
      if (input.isAnnouncement)
        requireValue(
          input.replyToMessageId === undefined,
          'Announcements cannot reply to a message.'
        );
      else
        requireValue(
          input.announcementColor === undefined,
          'announcementColor applies only to announcements.'
        );
      break;
    case 'manage_moderation':
      if (input.action === 'ban') {
        fields(input, [
          'broadcasterId',
          'action',
          'targetUserId',
          'durationSeconds',
          'reason'
        ]);
        requireValue(input.targetUserId, 'targetUserId is required.');
        if (input.durationSeconds !== undefined)
          integer(input.durationSeconds, 1, 1209600, 'durationSeconds');
        if (input.reason !== undefined)
          requireValue(
            typeof input.reason === 'string' && [...input.reason].length <= 500,
            'reason must be at most 500 characters.'
          );
      } else if (input.action === 'unban') {
        fields(input, ['broadcasterId', 'action', 'targetUserId']);
        requireValue(input.targetUserId, 'targetUserId is required for unban.');
      } else if (input.action === 'delete_message') {
        fields(input, ['broadcasterId', 'action', 'messageId']);
        requireValue(input.messageId, 'messageId is required for deletion.');
      } else fields(input, ['broadcasterId', 'action']);
      break;
    case 'manage_chat_settings':
      if (input.action === 'get') fields(input, ['broadcasterId', 'action']);
      else {
        requireValue(
          Object.keys(pickDefined(input)).length > 2,
          'Provide a chat setting to update.'
        );
        if (input.followerModeDurationMinutes !== undefined) {
          integer(input.followerModeDurationMinutes, 0, 129600, 'followerModeDurationMinutes');
          requireValue(
            input.followerMode === true,
            'Set followerMode to true when changing its duration.'
          );
        }
        if (input.slowModeWaitTimeSeconds !== undefined) {
          integer(input.slowModeWaitTimeSeconds, 3, 120, 'slowModeWaitTimeSeconds');
          requireValue(
            input.slowMode === true,
            'Set slowMode to true when changing its wait time.'
          );
        }
      }
      break;
    case 'manage_roles':
      if (input.action === 'list')
        fields(input, ['broadcasterId', 'role', 'action', 'maxResults', 'cursor']);
      else fields(input, ['broadcasterId', 'role', 'action', 'userId']);
      break;
    case 'manage_raids':
      if (input.action === 'cancel') fields(input, ['action', 'fromBroadcasterId']);
      else
        requireValue(
          input.fromBroadcasterId !== input.toBroadcasterId,
          'A broadcaster cannot raid themselves.'
        );
      break;
    case 'send_shoutout':
      requireValue(
        input.fromBroadcasterId !== input.toBroadcasterId,
        'A broadcaster cannot give themselves a shoutout.'
      );
      break;
    case 'start_commercial':
      integer(input.lengthSeconds, 1, 180, 'lengthSeconds');
      break;
    case 'manage_polls':
    case 'manage_predictions': {
      const poll = key === 'manage_polls';
      if (input.action === 'get')
        fields(input, [
          'broadcasterId',
          'action',
          poll ? 'pollId' : 'predictionId',
          'maxResults',
          'cursor'
        ]);
      else if (input.action === 'end') {
        fields(input, [
          'broadcasterId',
          'action',
          poll ? 'pollId' : 'predictionId',
          'endStatus',
          ...(poll ? [] : ['winningOutcomeId'])
        ]);
        if (!poll)
          requireValue(
            (input.endStatus === 'RESOLVED') === (input.winningOutcomeId !== undefined),
            'winningOutcomeId is required only for RESOLVED predictions.'
          );
      } else {
        fields(input, [
          'broadcasterId',
          'action',
          'title',
          ...(poll
            ? [
                'choices',
                'durationSeconds',
                'channelPointsVotingEnabled',
                'channelPointsPerVote'
              ]
            : ['outcomes', 'predictionWindowSeconds'])
        ]);
        requireValue(
          typeof input.title === 'string' &&
            input.title.length > 0 &&
            [...input.title].length <= (poll ? 60 : 45),
          'The title exceeds the native Twitch limit.'
        );
        const choices = input[poll ? 'choices' : 'outcomes'];
        requireValue(
          Array.isArray(choices) && choices.length >= 2 && choices.length <= (poll ? 5 : 10),
          'Provide the supported number of choices/outcomes.'
        );
        for (const choice of choices)
          requireValue(
            typeof choice === 'string' && choice.length > 0 && [...choice].length <= 25,
            'Each choice/outcome must contain 1-25 characters.'
          );
        integer(
          input[poll ? 'durationSeconds' : 'predictionWindowSeconds'],
          poll ? 15 : 30,
          poll ? 1800 : 1800,
          poll ? 'durationSeconds' : 'predictionWindowSeconds'
        );
        if (input.channelPointsPerVote !== undefined) {
          integer(input.channelPointsPerVote, 1, 1000000, 'channelPointsPerVote');
          requireValue(
            input.channelPointsVotingEnabled === true,
            'Enable Channel Points voting before setting its cost.'
          );
        }
      }
      break;
    }
    case 'manage_channel_points': {
      const edit = [
        'title',
        'cost',
        'prompt',
        'isEnabled',
        'backgroundColor',
        'isUserInputRequired',
        'maxPerStream',
        'maxPerUserPerStream',
        'globalCooldownSeconds',
        'skipRedemptionQueue'
      ];
      if (input.action === 'create' || input.action === 'update') {
        fields(input, [
          'broadcasterId',
          'action',
          ...edit,
          ...(input.action === 'update' ? ['rewardId', 'isPaused'] : [])
        ]);
        if (input.action === 'update')
          requireValue(
            Object.keys(pickDefined(input)).some(k => edit.includes(k) || k === 'isPaused'),
            'Provide a reward field to update.'
          );
        if (input.cost !== undefined) integer(input.cost, 1, Number.MAX_SAFE_INTEGER, 'cost');
        if (input.title !== undefined)
          requireValue(
            typeof input.title === 'string' &&
              input.title.length > 0 &&
              [...input.title].length <= 45,
            'Reward title must contain 1-45 characters.'
          );
        if (input.prompt !== undefined)
          requireValue(
            typeof input.prompt === 'string' && [...input.prompt].length <= 200,
            'Reward prompt must be at most 200 characters.'
          );
        if (input.backgroundColor !== undefined)
          requireValue(
            typeof input.backgroundColor === 'string' &&
              /^#[0-9a-f]{6}$/i.test(input.backgroundColor),
            'Use a #RRGGBB background color.'
          );
        for (const name of ['maxPerStream', 'maxPerUserPerStream', 'globalCooldownSeconds'])
          if (input[name] !== undefined)
            integer(input[name], 0, Number.MAX_SAFE_INTEGER, name);
      } else if (input.action === 'get' || input.action === 'delete')
        fields(input, ['broadcasterId', 'action', 'rewardId']);
      else if (input.action === 'get_redemptions')
        fields(input, [
          'broadcasterId',
          'action',
          'rewardId',
          'redemptionFilter',
          'maxResults',
          'cursor'
        ]);
      else
        fields(input, [
          'broadcasterId',
          'action',
          'rewardId',
          'redemptionIds',
          'redemptionStatus'
        ]);
      break;
    }
  }
}
