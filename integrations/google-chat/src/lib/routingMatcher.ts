// The project ID comes from the token-proven service account email, not user input.
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
  // User OAuth connections and those without a project number cannot match app events.
  if (!projectNumber || !projectId) return [];
  return [buildGoogleChatAppRoutingMatcher({ projectNumber, projectId })];
};
