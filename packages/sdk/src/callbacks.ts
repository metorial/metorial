export let setCallbackHandler = (c: {
  install?: (data: { callbackUrl: string; callbackId: string }) => Promise<void>;
  handle?: (data: {
    callbackId: string;
    eventId: string;
    payload: any;
  }) => Promise<any | null>;
  poll?: (data: {
    callbackId: string;
    setState: (v: any) => void;
    state: any;
  }) => Promise<any[] | null>;
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
