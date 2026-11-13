/** Records a page token in `seen`; `false` means it repeated and following it would loop. */
export let rememberPageToken = (seen: Set<string>, token: string) => {
  if (seen.has(token)) return false;
  seen.add(token);
  return true;
};

/** Throws `repeated()` when a listing returns a page token it already returned. */
export let assertNewPageToken = (
  seen: Set<string>,
  token: string | null | undefined,
  repeated: () => unknown
) => {
  if (token && !rememberPageToken(seen, token)) throw repeated();
};
