export let getResponseHeaderValue = (headers: unknown, name: string): string | undefined => {
  if (!headers) return undefined;

  if (typeof (headers as { get?: unknown }).get === 'function') {
    let value = (headers as { get(headerName: string): unknown }).get(name);
    return typeof value === 'string' ? value : undefined;
  }

  if (typeof headers !== 'object') return undefined;

  let lowerName = name.toLowerCase();
  for (let [headerName, value] of Object.entries(headers as Record<string, unknown>)) {
    if (headerName.toLowerCase() !== lowerName) continue;

    if (Array.isArray(value)) {
      let first = value.find(item => typeof item === 'string');
      return typeof first === 'string' ? first : undefined;
    }

    return typeof value === 'string' ? value : undefined;
  }

  return undefined;
};

export let getBase64ByteLength = (contentBase64: string) =>
  Buffer.from(contentBase64, 'base64').byteLength;
