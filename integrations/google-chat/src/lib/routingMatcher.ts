/**
 * Shared routing identity for Google Chat app interaction events. The webhook
 * `process` handler builds it from the verified registration (the Chat app's
 * Google Cloud project number and project ID) and `routingMatchers` builds it
 * from the connection's persisted service account auth, so both sides compare
 * equal. The project ID comes from the service account email, which the token
 * exchange proves, so a connection cannot claim another project's app events by
 * typing its project number.
 */
export let buildGoogleChatAppRoutingMatcher = (input: {
  projectNumber: string;
  projectId: string;
}) => ({
  installType: 'chat_app' as const,
  projectNumber: input.projectNumber.trim(),
  projectId: input.projectId.trim().toLowerCase()
});

export interface GoogleChatAuthLike {
  projectNumber?: string;
  projectId?: string;
}

export let buildGoogleChatConnectionRoutingMatchers = (auth: GoogleChatAuthLike) => {
  let projectNumber = auth.projectNumber?.trim();
  let projectId = auth.projectId?.trim();
  // User OAuth connections and service account connections created without a
  // project number cannot be matched to Chat app events.
  if (!projectNumber || !projectId) return [];
  return [buildGoogleChatAppRoutingMatcher({ projectNumber, projectId })];
};
