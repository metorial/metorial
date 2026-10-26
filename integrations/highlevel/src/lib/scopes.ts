import { anyOf, createApiServiceError } from 'slates';
import type { HighLevelAuth } from './types';

// This is an auth-method marker, never a claim about provider-issued token grants.
export const HIGHLEVEL_PRIVATE_TOKEN_SCOPE = 'highlevel:private-token';

export const highLevelOAuthScopes = [
  { scope: 'locations.readonly', title: 'Read sub-account identity' },
  { scope: 'locations/customFields.readonly', title: 'Read custom fields' },
  { scope: 'calendars.readonly', title: 'Read calendars' },
  { scope: 'calendars/events.readonly', title: 'Read calendar events and appointment notes' },
  { scope: 'contacts.readonly', title: 'Read contacts and tasks' },
  { scope: 'contacts.write', title: 'Create and update contacts and tags' },
  { scope: 'conversations.readonly', title: 'Search conversations' },
  { scope: 'conversations/message.readonly', title: 'Read messages' },
  { scope: 'conversations/message.write', title: 'Send messages' },
  { scope: 'opportunities.readonly', title: 'Read opportunities and pipelines' },
  { scope: 'opportunities.write', title: 'Update opportunities' },
  { scope: 'payments/orders.readonly', title: 'Read orders' },
  { scope: 'payments/transactions.readonly', title: 'Read transactions' },
  { scope: 'blogs/check-slug.readonly', title: 'Check blog URL slugs' },
  { scope: 'blogs/post.write', title: 'Create blog posts' },
  { scope: 'blogs/post-update.write', title: 'Update blog posts' },
  { scope: 'blogs/author.readonly', title: 'Read blog authors' },
  { scope: 'blogs/category.readonly', title: 'Read blog categories' },
  { scope: 'blogs/posts.readonly', title: 'Read blog posts' },
  { scope: 'blogs/list.readonly', title: 'Read blogs' },
  { scope: 'emails/templates.readonly', title: 'Read email templates' },
  { scope: 'emails/templates.write', title: 'Create and import email templates' },
  { scope: 'socialplanner/account.readonly', title: 'Read social accounts' },
  { scope: 'socialplanner/statistics.readonly', title: 'Read social statistics' },
  { scope: 'socialplanner/post.readonly', title: 'Read social posts' },
  { scope: 'socialplanner/post.write', title: 'Create and update social posts' }
];

export const highLevelScope = (scope: string) => anyOf(scope, HIGHLEVEL_PRIVATE_TOKEN_SCOPE);

export const requireHighLevelScope = (auth: HighLevelAuth, scope: string) => {
  if (auth.authType === 'private_token') return;
  if (!auth.scopes?.includes(scope)) {
    throw createApiServiceError(
      `This action requires the HighLevel OAuth permission ${scope}. Reconnect the same sub-account with this permission enabled.`,
      { reason: 'highlevel_missing_scope' }
    );
  }
};
