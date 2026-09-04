import { describe, expect, it } from 'vitest';
import { provider } from './index';

describe('Bitbucket tool registration', () => {
  it('does not expose the retired Bitbucket issue tracker tools', () => {
    const toolKeys = provider.actions
      .filter(action => action.type === 'tool')
      .map(action => action.key);

    expect(toolKeys).not.toContain('list_issues');
    expect(toolKeys).not.toContain('create_issue');
    expect(toolKeys).not.toContain('update_issue');
    expect(toolKeys).not.toContain('comment_on_issue');
    expect(provider.actions.map(action => action.key)).not.toContain('issue_events');
  });
});
