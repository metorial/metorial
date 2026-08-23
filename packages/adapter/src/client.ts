import type { SlateAdapterDefinition } from './definition';
import type { SlateAdapterToolDefinition } from './tool';
import type { SlateAdapterTriggerDefinition } from './trigger';

type InferIO<T> =
  T extends SlateAdapterToolDefinition<infer I, infer O, any, any>
    ? { input: I; output: O }
    : T extends SlateAdapterTriggerDefinition<infer I, infer O, any>
      ? { input: I; output: O }
      : never;

type ByActionKey<Actions extends Record<string, { key: string }>> = {
  [K in keyof Actions as Actions[K]['key'] & string]: InferIO<Actions[K]>;
};

export type InferClient<T> =
  T extends SlateAdapterDefinition<infer Caps, infer Tools, infer Triggers>
    ? {
        tools: ByActionKey<Tools>;
        triggers: ByActionKey<Triggers>;
        capabilities: Caps;
      }
    : never;
