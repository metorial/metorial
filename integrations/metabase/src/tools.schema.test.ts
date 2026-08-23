import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import {
  executeQuery,
  manageAlert,
  manageCollection,
  manageDashboard,
  manageDashboardCards,
  managePermissions,
  managePublicLink,
  manageQuestion,
  manageUser
} from './tools';

describeMcpCompatibleToolSchemas('Metabase tool input schemas', provider.actions);

describe('Metabase tool safety contracts', () => {
  it('does not advertise arbitrary native SQL as read-only', () => {
    expect(executeQuery.tags).toMatchObject({ destructive: true, readOnly: false });
  });

  it('marks consolidated tools with destructive actions accordingly', () => {
    expect(
      [
        manageAlert,
        manageCollection,
        manageDashboard,
        manageDashboardCards,
        managePermissions,
        managePublicLink,
        manageQuestion,
        manageUser
      ].map(tool => tool.tags)
    ).toEqual(Array.from({ length: 8 }, () => expect.objectContaining({ destructive: true })));
  });
});
