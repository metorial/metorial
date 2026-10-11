// Reactions add emoji and timestamp because Meta reuses the wamid for add and remove.
export let getWhatsAppEventId = (message: {
  id: string;
  type?: string | null;
  timestamp?: string | null;
  reaction?: unknown;
}) => {
  if (message.type !== 'reaction') return message.id;

  let reaction = (message.reaction ?? {}) as { emoji?: unknown };
  let emoji =
    typeof reaction.emoji === 'string' && reaction.emoji ? reaction.emoji : 'removed';
  return `${message.id}:reaction:${emoji}:${message.timestamp ?? ''}`;
};
