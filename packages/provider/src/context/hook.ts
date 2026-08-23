import { AsyncLocalStorage } from 'async_hooks';
import type { SlateContext, SlatePublicContext } from './context';

let slateContextStorageKey = Symbol.for('slates.provider.context.asyncLocalStorage');
let globalWithSlateContext = globalThis as typeof globalThis & {
  [key: symbol]: AsyncLocalStorage<SlatePublicContext<any>> | undefined;
};

let asyncLocalStorage =
  globalWithSlateContext[slateContextStorageKey] ??
  new AsyncLocalStorage<SlatePublicContext<any>>();

globalWithSlateContext[slateContextStorageKey] = asyncLocalStorage;

export let runWithContext = <InputType extends {}, RV>(
  context: SlatePublicContext<InputType>,
  fn: () => Promise<RV>
): Promise<RV> => {
  return asyncLocalStorage.run(context, fn);
};

export let getCurrentContext = <
  ConfigType extends {},
  AuthType extends {},
  InputType extends {}
>(): SlateContext<ConfigType, AuthType, InputType> => {
  let context = asyncLocalStorage.getStore();
  if (!context) {
    throw new Error('No Slate context is available');
  }
  return context as SlateContext<ConfigType, AuthType, InputType>;
};
