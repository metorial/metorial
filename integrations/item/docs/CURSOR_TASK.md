# Cursor Handoff

Open this workspace in Cursor and run Agent mode in this folder.

## Suggested prompt

Paste the prompt below into Cursor Agent:

```markdown
You are implementing a Slates integration for **item** inside this generated workspace.

This workspace was created in **Cursor mode**. Do the research and implementation work in Cursor Agent using the user's Cursor credits. Do not rely on an external Anthropic API key.

## Provided Context

Documentation URL: https://docs.item.app/

## Requirements

- Use the official item API docs as the primary source
- Implement x-api-key authentication
- Prioritize objects CRUD, views, batch upsert, schema, users, and webhook-triggered skills

## Your Tasks

1. Research the provider using the official docs and any URLs or notes included above.
2. Replace `docs/SPEC.md` with a complete specification containing:
   - Overview
   - Authentication
   - Features
   - Events
3. Update `slate.json` after research:
   - Replace the placeholder `description`
   - Set `categories` to 1-3 valid categories
   - Set `skills` to 3-10 short action-oriented capabilities
4. Implement the integration in `src/`:
   - `config.ts`
   - `auth.ts`
   - `lib/client.ts` and any helper files in `lib/`
   - tools in `src/tools/`
   - triggers in `src/triggers/`
   - register everything in `src/index.ts`
5. Remove placeholder exports/imports and ensure the generated slate is coherent and usable.
6. Run `bun run typecheck` and fix any issues you can.

## Metadata Rules

- Categories must use **only** these identifiers (same as [metorial/registry `data/data/categories.json`](https://github.com/metorial/registry/blob/main/data/data/categories.json)): apis-and-http-requests, code-execution, crm-and-sales-tools, document-processing, e-commerce-and-retail, education-and-learning, email-and-messaging, financial-data-and-stock-market, healthcare-and-medical, hr-and-recruiting, iot-and-device-control, language-translation, legal-and-compliance, news-and-media, note-taking-and-knowledge-bases, scheduling-and-calendars, security, speech-recognition-and-synthesis, task-and-project-management, web-search
- Choose the most specific categories that fit the provider.
- Skills should be short phrases like "list objects", "create company", "run view", "batch upsert records".

## Important Constraints

- Use TypeScript.
- Use `zod` for schemas.
- Use the `slates` package APIs already referenced in the boilerplate.
- Do not use third-party SDKs.
- Do not use `fetch` or the standalone `axios` package.
- For HTTP requests, use `createAxios` or `axios` from `slates`.
- Keep requests in `src/lib/`, not directly in tools or triggers.
- Prefer user-friendly tools over one-endpoint-per-tool mappings.
- If the provider supports webhook registration programmatically, implement it. Otherwise design triggers for manual webhook setup or polling as appropriate.

## Authentication Rules

- If the provider uses any token or API key, expose it as `token` in the auth output schema.
- If the provider uses API keys, headers, tenant/workspace inputs, or custom auth values, model those clearly.
- If the provider has no auth, keep `.addNone()`.

## Final Deliverable

When you are done, this workspace should contain:

- a researched `docs/SPEC.md`
- updated `slate.json` metadata
- implemented auth/config/client/tools/triggers
- a working `src/index.ts` registration file
```

## Verification

After implementation, run:

```bash
bun run typecheck
```
