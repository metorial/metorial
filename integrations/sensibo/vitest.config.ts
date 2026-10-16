export default {
  root: new URL('.', import.meta.url).pathname,
  test: { include: ['src/deprecation.contract.test.ts'], environment: 'node' }
};
