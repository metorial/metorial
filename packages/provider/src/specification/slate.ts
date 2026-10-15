import type { SlateTool, SlateToolCategory, SlateTrigger, SlateTriggerGroup } from '../action';
import type { SlateAdapter } from '../adapter';
import { SlateDeclarationError } from '../error';
import type { SlateSpecification } from './specification';

export class Slate<ConfigType extends {}, AuthType extends {}> {
  private constructor(
    private readonly _spec: SlateSpecification<ConfigType, AuthType>,
    private readonly _actions: (
      | SlateTrigger<ConfigType, AuthType, any, any>
      | SlateTool<ConfigType, AuthType, any, any>
    )[],
    private readonly _adapters: SlateAdapter<ConfigType, AuthType>[],
    private readonly _triggerGroups: SlateTriggerGroup<ConfigType, AuthType>[],
    private readonly _toolCategories: SlateToolCategory[],
    private readonly _toolCategoryKeysByActionKey: Map<string, string[]>
  ) {}

  static create<ConfigType extends {}, AuthType extends {}>(params: {
    spec: SlateSpecification<ConfigType, AuthType>;
    triggers: SlateTrigger<ConfigType, AuthType, any, any>[];
    tools: SlateTool<ConfigType, AuthType, any, any>[];
    adapters?: SlateAdapter<ConfigType, AuthType>[];
    triggerGroups?: SlateTriggerGroup<ConfigType, AuthType>[];
    toolCategories?: SlateToolCategory[];
  }) {
    let adapters = params.adapters ?? [];
    let actions = [...params.triggers, ...params.tools];
    let seenAdapterIds = new Set<string>();
    let seenActionKeys = new Map(actions.map(action => [action.key, action]));

    for (let adapter of adapters) {
      if (seenAdapterIds.has(adapter.id)) {
        throw new SlateDeclarationError(
          `Adapter "${adapter.id}" is registered more than once`
        );
      }
      seenAdapterIds.add(adapter.id);

      for (let action of adapter.actions ?? []) {
        let existing = seenActionKeys.get(action.key);
        if (existing && existing !== action) {
          throw new SlateDeclarationError(
            `Adapter "${adapter.id}" action "${action.key}" conflicts with another action`
          );
        }

        if (!existing) {
          actions.push(action);
          seenActionKeys.set(action.key, action);
        }
      }
    }

    let triggerGroups = params.triggerGroups ?? [];
    let seenTriggerGroupKeys = new Set<string>();
    for (let group of triggerGroups) {
      if (seenTriggerGroupKeys.has(group.key)) {
        throw new SlateDeclarationError(
          `Trigger group "${group.key}" is registered more than once`
        );
      }
      seenTriggerGroupKeys.add(group.key);
    }

    let manualWebhookTriggerGroups = triggerGroups.filter(
      group => group.source === 'webhook' && group.webhook?.manualRegistration
    );
    if (manualWebhookTriggerGroups.length > 1) {
      throw new SlateDeclarationError(
        `Only one trigger group may use manual webhook registration, but found: ${manualWebhookTriggerGroups
          .map(group => group.key)
          .join(', ')}`
      );
    }

    let toolCategories = params.toolCategories ?? [];
    let toolCategoryKeysByActionKey = resolveToolCategoryMembership(toolCategories, actions);

    return new Slate(
      params.spec,
      actions,
      adapters,
      triggerGroups,
      toolCategories,
      toolCategoryKeysByActionKey
    );
  }

  get spec() {
    return this._spec;
  }

  get actions() {
    return this._actions ?? [];
  }

  get adapters() {
    return this._adapters ?? [];
  }

  get triggerGroups() {
    return this._triggerGroups ?? [];
  }

  get toolCategories() {
    return this._toolCategories ?? [];
  }

  // Keys of the tool categories an action belongs to, in declared category order.
  getToolCategoryKeys(actionKey: string) {
    return [...(this._toolCategoryKeysByActionKey?.get(actionKey) ?? [])];
  }
}

let TOOL_CATEGORY_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

let isHttpUrl = (value: string) => {
  try {
    let url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

type SlateActionAny = SlateTool<any, any, any, any> | SlateTrigger<any, any, any, any>;

let resolveToolCategoryMembership = (
  toolCategories: SlateToolCategory[],
  actions: SlateActionAny[]
) => {
  // Actions resolve by key and the first registered one wins, so a shadowed duplicate must
  // not lend its categories to the action that actually runs.
  let effectiveActions = new Map<string, SlateActionAny>();
  for (let action of actions) {
    if (!effectiveActions.has(action.key)) effectiveActions.set(action.key, action);
  }
  let registeredActions = new Set(actions);
  let membersByCategoryKey = new Map<string, Set<string>>();

  for (let category of toolCategories) {
    if (!TOOL_CATEGORY_KEY_PATTERN.test(category.key)) {
      throw new SlateDeclarationError(
        `Tool category key "${category.key}" must match ${TOOL_CATEGORY_KEY_PATTERN}`
      );
    }
    if (membersByCategoryKey.has(category.key)) {
      throw new SlateDeclarationError(
        `Tool category "${category.key}" is registered more than once`
      );
    }
    if (!category.name?.trim()) {
      throw new SlateDeclarationError(`Tool category "${category.key}" must have a name`);
    }
    if (category.imageUrl !== undefined && !isHttpUrl(category.imageUrl)) {
      throw new SlateDeclarationError(
        `Tool category "${category.key}" imageUrl must be an absolute http(s) URL`
      );
    }
    if (!category.tools?.length) {
      throw new SlateDeclarationError(
        `Tool category "${category.key}" must list at least one tool`
      );
    }

    let members = new Set<string>();
    for (let tool of category.tools) {
      if (!registeredActions.has(tool)) {
        throw new SlateDeclarationError(
          `Tool category "${category.key}" lists tool "${tool.key}", which is not registered in this slate`
        );
      }
      if (tool.type !== 'tool') {
        throw new SlateDeclarationError(
          `Tool category "${category.key}" lists trigger "${tool.key}", but only tools can belong to a tool category`
        );
      }
      if (effectiveActions.get(tool.key) === tool) members.add(tool.key);
    }
    membersByCategoryKey.set(category.key, members);
  }

  let keysByActionKey = new Map<string, string[]>();
  for (let category of toolCategories) {
    for (let actionKey of membersByCategoryKey.get(category.key) ?? []) {
      let keys = keysByActionKey.get(actionKey) ?? [];
      keys.push(category.key);
      keysByActionKey.set(actionKey, keys);
    }
  }

  return keysByActionKey;
};
