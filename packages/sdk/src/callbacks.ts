export type CallbackHandlerResult = {
  type: string;
  result: Record<string, any>;
} | null;

export type PollingResult = Record<string, any>[] | null;

export let setCallbackHandler = (c: {
  install?: (data: { callbackUrl: string; callbackId: string }) => Promise<unknown> | unknown;
  handle?: (data: {
    callbackId: string;
    eventId: string;
    payload: any;
  }) => Promise<CallbackHandlerResult> | CallbackHandlerResult;
  poll?: (data: {
    callbackId: string;
    setState: (v: any) => void;
    state: Record<string, any>;
  }) => Promise<PollingResult> | PollingResult;
}) => {
  if (c.handle === undefined) {
    throw new Error('handle is required');
  }

  // @ts-ignore
  globalThis.__metorial_setCallbackHandler__({
    installHook: c.install,
    handleHook: c.handle,
    pollHook: c.poll
  });
};
