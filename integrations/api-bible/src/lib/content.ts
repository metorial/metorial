/** Preserve the public string field for every documented content format. */
export let scriptureContent = (content: string | Record<string, unknown>[]) =>
  typeof content === 'string' ? content : JSON.stringify(content);
