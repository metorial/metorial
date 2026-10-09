import type {
  TeamsActivity,
  TeamsActivityEvent,
  TeamsActivityEventKind
} from '../../triggers/botFrameworkTriggerGroup';

export let isTeamsEventKind = (payload: unknown, kind: TeamsActivityEventKind) => {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return false;
  let event = payload as { kind?: unknown; activity?: unknown };
  return (
    event.kind === kind &&
    typeof event.activity === 'object' &&
    event.activity !== null &&
    !Array.isArray(event.activity)
  );
};

/**
 * The bot's Microsoft App ID for mapping. Connections are routed by App ID, so
 * the connection's id and the activity recipient (`28:<appId>`) agree.
 */
export let resolveEventAppId = (auth: { appId?: string }, activity: TeamsActivity) => {
  if (auth.appId) return auth.appId;
  let recipient = activity.recipient?.id ?? '';
  return recipient.startsWith('28:') ? recipient.slice(3) : recipient;
};

export let asTeamsEvent = (input: unknown) => input as TeamsActivityEvent;
