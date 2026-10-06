import { createApiServiceError } from 'slates';

export let validateAgentSettings = (body: Record<string, unknown>) => {
  if (body.language === 'multi') {
    throw createApiServiceError(
      'Use languages with an explicit list of locale codes for multilingual agents.'
    );
  }
  for (let [field, min, max] of [
    ['voice_speed', 0.5, 2],
    ['volume', 0, 2],
    ['responsiveness', 0, 1],
    ['interruption_sensitivity', 0, 1]
  ] as const) {
    let value = body[field];
    if (
      value !== undefined &&
      (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    ) {
      throw createApiServiceError(`${field} must be a number between ${min} and ${max}.`);
    }
  }
  let engine = body.response_engine;
  if (engine === undefined) return;
  if (!engine || typeof engine !== 'object' || Array.isArray(engine)) {
    throw createApiServiceError(
      'responseEngine must be a response engine configuration object.'
    );
  }
  let value = engine as Record<string, unknown>;
  let id =
    value.type === 'retell-llm'
      ? value.llm_id
      : value.type === 'conversation-flow'
        ? value.conversation_flow_id
        : value.type === 'custom-llm'
          ? value.llm_websocket_url
          : undefined;
  if (typeof id !== 'string' || !id.trim()) {
    throw createApiServiceError(
      'responseEngine requires type retell-llm with llm_id, conversation-flow with conversation_flow_id, or custom-llm with llm_websocket_url. Use create_retell_llm or list_retell_llms to find an LLM ID.'
    );
  }
};
