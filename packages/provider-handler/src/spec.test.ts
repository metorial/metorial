import { isServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { getMappableAction, getTriggersForGroup, isMappableTrigger, mapAction } from './spec';

let baseAction = {
  key: 'do_thing',
  name: 'Do Thing',
  description: 'desc',
  instructions: undefined,
  constraints: undefined,
  tags: [],
  metadata: {},
  scopes: [],
  authMethods: [],
  docs: [],
  adapter: undefined,
  inputSchema: z.object({}),
  outputSchema: z.object({})
};

let toolAction: any = { ...baseAction, type: 'tool', isPublic: false };

let validTriggerGroup = { key: 'my_group', name: 'My Group' };
let validTrigger: any = {
  ...baseAction,
  type: 'trigger',
  triggerGroup: validTriggerGroup,
  matches: () => true,
  map: () => ({})
};

let incompatibleTrigger: any = { ...baseAction, type: 'trigger', triggerGroup: undefined };

describe('isMappableTrigger', () => {
  it('is true for tool actions', () => {
    expect(isMappableTrigger(toolAction)).toBe(true);
  });

  it('is true for triggers with a trigger group', () => {
    expect(isMappableTrigger(validTrigger)).toBe(true);
  });

  it('is false for triggers missing a trigger group', () => {
    expect(isMappableTrigger(incompatibleTrigger)).toBe(false);
  });
});

describe('mapAction', () => {
  it('maps a well-formed trigger', () => {
    let mapped = mapAction({} as any, validTrigger);
    expect(mapped).toMatchObject({ type: 'action.trigger', triggerGroupId: 'my_group' });
  });
});

describe('getTriggersForGroup', () => {
  it('filters out triggers missing a trigger group instead of throwing', () => {
    let slate = { actions: [toolAction, validTrigger, incompatibleTrigger] } as any;

    expect(getTriggersForGroup(slate, 'my_group')).toEqual([validTrigger]);
    expect(getTriggersForGroup(slate, 'other_group')).toEqual([]);
  });
});

describe('getMappableAction', () => {
  it('returns tool and well-formed trigger actions', () => {
    let slate = { actions: [toolAction, validTrigger] } as any;

    expect(getMappableAction(slate, 'do_thing')).toBe(toolAction);
  });

  it('treats a trigger missing its group as not found instead of crashing', () => {
    let slate = { actions: [incompatibleTrigger] } as any;

    try {
      getMappableAction(slate, 'do_thing');
      expect.unreachable();
    } catch (e) {
      expect(isServiceError(e)).toBe(true);
      expect((e as any).data.status).toBe(404);
    }
  });
});
