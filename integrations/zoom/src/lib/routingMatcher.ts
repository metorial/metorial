/**
 * One helper for both sides of chatbot webhook routing: the connection's
 * `.routingMatchers` (from chatbot auth) and the matchers `process` derives
 * from a verified delivery (`robotJid` + `accountId`). JIDs are compared
 * case-insensitively.
 */
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
