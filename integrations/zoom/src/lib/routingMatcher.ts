// Shared by `.routingMatchers` and `process` so both sides normalize identically.
export interface ZoomChatbotMatcherInput {
  botJid: string;
  accountId: string;
}

export let buildZoomChatbotRoutingMatcher = (input: ZoomChatbotMatcherInput) => ({
  installType: 'chatbot' as const,
  botJid: input.botJid.trim().toLowerCase(),
  accountId: input.accountId.trim()
});

export let buildZoomChatbotRoutingMatchers = (auth: {
  botJid?: string;
  accountId?: string;
}) => {
  if (!auth.botJid?.trim() || !auth.accountId?.trim()) return [];
  return [buildZoomChatbotRoutingMatcher({ botJid: auth.botJid, accountId: auth.accountId })];
};
