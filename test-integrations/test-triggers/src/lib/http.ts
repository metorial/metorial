export let jsonResponse = (
  status: number,
  body?: unknown,
  headers: Record<string, string> = {}
) => ({
  status,
  headers: { 'content-type': 'application/json', ...headers },
  body: body === undefined ? '' : JSON.stringify(body)
});

export let textResponse = (
  status: number,
  body: string,
  headers: Record<string, string> = {}
) => ({
  status,
  headers: { 'content-type': 'text/plain', ...headers },
  body
});
