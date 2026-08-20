import type { InferClient } from './client';
import type { SlateAdapterCapabilityRule, SlateAdapterDefinition } from './definition';

export type SlateAdapterAdvertisedCapability = {
  id: string;
  value: any;
};

export type SlateAdapterAdvertised =
  | readonly SlateAdapterAdvertisedCapability[]
  | { capabilities: readonly SlateAdapterAdvertisedCapability[] };

export type AdapterActionKey<T> =
  | (keyof InferClient<T>['tools'] & string)
  | (keyof InferClient<T>['triggers'] & string);

export type AdapterCapabilityKey<T> = keyof InferClient<T>['capabilities'] & string;

let advertisedCapabilities = (
  advertised: SlateAdapterAdvertised
): readonly SlateAdapterAdvertisedCapability[] => {
  if ('capabilities' in advertised && !Array.isArray(advertised)) {
    return advertised.capabilities;
  }

  return advertised;
};

let isAdvertisedCapabilityEnabled = (
  advertised: SlateAdapterAdvertised,
  capabilityId: string
) =>
  advertisedCapabilities(advertised).some(
    (capability: SlateAdapterAdvertisedCapability) =>
      capability.id === capabilityId && capability.value === true
  );

let ruleListsAction = (rule: SlateAdapterCapabilityRule, action: string) =>
  (rule.tools ?? []).includes(action) || (rule.triggers ?? []).includes(action);

export let isAdapterCapabilityAvailable = <T extends SlateAdapterDefinition<any, any, any>>(
  _adapter: T,
  advertised: SlateAdapterAdvertised,
  capability: AdapterCapabilityKey<T>
) => isAdvertisedCapabilityEnabled(advertised, capability);

export let isAdapterActionAvailable = <T extends SlateAdapterDefinition<any, any, any>>(
  adapter: T,
  advertised: SlateAdapterAdvertised,
  action: AdapterActionKey<T>
) => {
  let actionKey = String(action);
  let rules = adapter.capabilityRules as Record<string, SlateAdapterCapabilityRule>;

  for (let [id, rule] of Object.entries(rules)) {
    if (!ruleListsAction(rule, actionKey)) continue;
    if (isAdvertisedCapabilityEnabled(advertised, id)) return true;
  }

  return false;
};
