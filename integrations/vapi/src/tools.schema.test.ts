import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { manageWorkflow } from './tools/manage-workflow';

describeMcpCompatibleToolSchemas('Vapi tool input schemas', provider.actions);

it('retains the workflow contract and advertises current alternatives', () => {
  expect(provider.actions.some(action => action.key === 'manage_workflow')).toBe(true);
  expect(provider.actions.some(action => action.key === 'manage_assistant')).toBe(true);
  expect(provider.actions.some(action => action.key === 'manage_squad')).toBe(true);
  expect(manageWorkflow.tags?.deprecated).toBe(true);
  expect(manageWorkflow.description).toMatch(/^DEPRECATED —/);
  expect(manageWorkflow.instructions?.join(' ')).toContain('manage_squad');
  expect(z.toJSONSchema(manageWorkflow.inputSchema)).toMatchObject({
    properties: { action: { enum: ['create', 'update', 'get', 'delete'] } }
  });
});
