# File Uploads

This document specifies the contract between `@slates/adapter-chat` and a
provider adapter (Slack, Discord, Telegram, or any future chat provider) for
message attachments. If you are implementing `metorial_chat$file.upload` or
`metorial_chat$message.send` for a provider, read this first.

Chat providers model "attach a file to a message" in three fundamentally
different ways. This package does not pick one shape and force every
provider into it -- instead it exposes a single, small extension to the
existing schemas (`attachmentRefSchema`, `uploadFile`'s input, and
`messageSchema`) that is flexible enough to express all three. Your job as
an adapter author is to figure out which shape your provider is, and
implement `file.upload` / `message.send` accordingly.

## The three provider shapes

### Shape A -- pre-upload (e.g. Slack)

The provider has a genuine, separate "upload a file, get back a durable
reference" API that is distinct from sending a message.

- `file.upload`'s adapter implementation should actually call that API.
- It returns `attachment: { status: 'complete', providerFileReference, ... }`
  -- the file is really stored on the provider's side at this point.
- No `message` is returned, because no message was created.
- The caller later references that attachment (typically via
  `providerFileReference`, echoed through `attachment.id` /
  `attachment.raw`, however your provider's `message.send` implementation
  expects it) in a subsequent `message.send` call, which posts exactly one
  message with the file attached.

### Shape B -- no separate upload (e.g. Discord)

The provider has no standalone "upload and get a reference back" concept.
Files can only be attached as part of creating the message itself (e.g. a
multipart body on the message-create call).

- `file.upload`'s implementation for this shape is a **no-op**. It must
  never call any provider API and must never store anything or produce a
  `$attachments`/slate-hub-tracked artifact, because nothing was actually
  uploaded.
- It simply echoes back:

  ```json
  {
    "attachment": {
      "type": "file",
      "name": "report.pdf",
      "mimeType": "application/pdf",
      "size": 482913,
      "status": "pending",
      "sourceUrl": "<input.fileUrl>",
      "clientReferenceId": "<input.clientReferenceId>"
    }
  }
  ```

  No `message` field.
- The real upload happens inside `message.send`'s implementation: when it
  sees an attachment on the outgoing body with `status: 'pending'`, it must
  fetch `sourceUrl` itself and perform the actual upload as part of the
  provider's message-create call.
- The message returned by `message.send` will then have that attachment
  finalized to `status: 'complete'` with a real `providerFileReference`.

### Shape C -- upload IS a message (e.g. Telegram)

The provider has no way to attach a file to an existing or otherwise
separate message at all. Sending a file (`sendDocument`, `sendPhoto`, ...)
is itself a full message-send operation that creates a real,
independently-addressable provider message.

- `file.upload`'s implementation should actually perform that provider call
  (i.e. create the real message).
- It returns **both**:
  - `attachment: { status: 'complete', providerFileReference, ... }`, and
  - `message: <the newly created message>`.
- `message.send` for this shape is completely unaffected and unaware of any
  of this. It is **never** responsible for uploading files, and it always
  creates exactly one message from text content only -- or is simply not
  called at all if the caller has no text to send alongside the files.
- The caller (Metorial's orchestration layer, not this package) is
  responsible for:
  1. calling `file.upload` once per file,
  2. noticing when `file.upload`'s response contains a populated `message`,
     and
  3. if it ends up with more than one resulting message from one logical
     "send text + attach files" operation, grouping them together on its
     own side.

  Adapter implementations for this shape don't need to know anything about
  that caller-side grouping. They only need to:
  - (a) return `message` from `file.upload` whenever their upload call
    created one, and
  - (b) populate `messageSchema.groupId` on any **inbound**-received
    messages that belong to a provider-side album/group they didn't create
    themselves (e.g. incoming Telegram albums via `media_group_id`). This is
    a distinct, unrelated *inbound* concern from the outbound concern in (a)
    -- outbound grouping is the caller's job; inbound grouping is
    communicated via `groupId` on messages your webhook/trigger handling
    produces.

## Decision checklist: which shape is my provider?

Ask these in order:

1. **Does sending a file always create a brand-new, independently
   addressable message, with no way to attach a file to an "existing"
   message or a message you're about to send separately?**
   Yes -> **Shape C**. Stop here.

2. **Does the provider have a dedicated "upload file" API call that returns
   a durable file reference you can later attach to a message sent via a
   separate API call?**
   Yes -> **Shape A**.

3. **Can files only be attached in the same API call that creates the
   message (no standalone upload endpoint)?**
   Yes -> **Shape B**.

If you answered "yes" to more than one, prefer the earliest applicable
shape in the list above (C, then A, then B) since C and A are the most
specific.

## Field reference

### `attachmentRefSchema` additions

| Field | Type | Meaning |
| --- | --- | --- |
| `status` | `'pending' \| 'complete'` (optional) | Omitted or `'complete'` means fully resolved (default/current behavior). `'pending'` means nothing has been uploaded or stored anywhere yet. |
| `sourceUrl` | `string` (URL, optional) | Populated only when `status: 'pending'`. A signed URL the receiving side (a `message.send` call) should fetch to actually perform the upload. |
| `clientReferenceId` | `string` (optional) | Caller-supplied correlation id. Adapters should echo it back onto the finalized attachment on a best-effort basis, so the caller can match "the file I asked to upload" to "the attachment that ended up on the sent message" without relying on array position. |

### `uploadFile` (`metorial_chat$file.upload`) input changes

| Field | Type | Meaning |
| --- | --- | --- |
| `fileUrl` | `string` (URL) | Short-lived signed URL the provider should fetch to get the file bytes. **Replaces** the old `content` + `encoding` fields. |
| `fileSize` | `number` (optional) | Size of the file in bytes, if known ahead of fetching it. |
| `clientReferenceId` | `string` (optional) | Passed through to the resulting `attachment.clientReferenceId`. |

The previously existing `content: string` and `encoding: 'base64' | 'utf-8'`
fields have been **removed**. This is a breaking change to the input shape
-- any existing caller that passed inline `content`/`encoding` must switch
to `fileUrl`.

`channelId`, `threadId` (optional), `filename`, and `mimeType` (optional)
are unchanged.

`downloadFile` and `messageResultSchema` are unaffected by this design and
have not changed.

### `messageSchema` addition

| Field | Type | Meaning |
| --- | --- | --- |
| `groupId` | `string` (optional) | The provider's raw grouping key for cases where a provider delivers what a user perceives as one message as several separate provider messages (e.g. Telegram's `media_group_id` for photo/media albums). Purely for inbound correlation; providers without this concept simply omit it. |

## Worked examples

### Shape A -- Slack

`file.upload` call:

```json
{
  "channelId": "C0123ABCD",
  "filename": "q3-report.pdf",
  "mimeType": "application/pdf",
  "fileUrl": "https://uploads.metorial.com/signed/f_8a1c...?exp=1755878400",
  "fileSize": 482913,
  "clientReferenceId": "upload-1"
}
```

`file.upload` response (Slack really stored the file):

```json
{
  "attachment": {
    "type": "file",
    "id": "F0123XYZ",
    "name": "q3-report.pdf",
    "mimeType": "application/pdf",
    "size": 482913,
    "status": "complete",
    "providerFileReference": { "fileId": "F0123XYZ" },
    "clientReferenceId": "upload-1"
  }
}
```

Subsequent `message.send` call, referencing the already-uploaded file:

```json
{
  "channelId": "C0123ABCD",
  "parts": [{ "type": "markdown", "markdown": "Here's the Q3 report:" }],
  "attachments": [
    {
      "type": "file",
      "id": "F0123XYZ",
      "name": "q3-report.pdf",
      "status": "complete",
      "providerFileReference": { "fileId": "F0123XYZ" }
    }
  ]
}
```

`message.send` response -- exactly one message:

```json
{
  "message": {
    "id": "1755878401.000200",
    "channelId": "C0123ABCD",
    "author": { "userId": "B01", "userName": "metorial-bot", "fullName": "Metorial", "type": "app", "isMe": true },
    "body": {
      "parts": [{ "type": "markdown", "markdown": "Here's the Q3 report:" }],
      "attachments": [
        {
          "type": "file",
          "id": "F0123XYZ",
          "name": "q3-report.pdf",
          "status": "complete",
          "providerFileReference": { "fileId": "F0123XYZ" }
        }
      ]
    },
    "metadata": { "sentAt": "2026-01-22T14:00:01.000Z", "edited": false }
  },
  "channel": { "id": "C0123ABCD", "type": "public" }
}
```

### Shape B -- Discord

`file.upload` call:

```json
{
  "channelId": "1102938475610",
  "filename": "diagram.png",
  "mimeType": "image/png",
  "fileUrl": "https://uploads.metorial.com/signed/f_2b7e...?exp=1755878400",
  "fileSize": 93482,
  "clientReferenceId": "upload-2"
}
```

`file.upload` response -- a no-op, nothing was contacted or stored:

```json
{
  "attachment": {
    "type": "image",
    "name": "diagram.png",
    "mimeType": "image/png",
    "size": 93482,
    "status": "pending",
    "sourceUrl": "https://uploads.metorial.com/signed/f_2b7e...?exp=1755878400",
    "clientReferenceId": "upload-2"
  }
}
```

`message.send` call, passing the still-pending attachment through:

```json
{
  "channelId": "1102938475610",
  "parts": [{ "type": "markdown", "markdown": "Architecture diagram attached." }],
  "attachments": [
    {
      "type": "image",
      "name": "diagram.png",
      "mimeType": "image/png",
      "size": 93482,
      "status": "pending",
      "sourceUrl": "https://uploads.metorial.com/signed/f_2b7e...?exp=1755878400",
      "clientReferenceId": "upload-2"
    }
  ]
}
```

The Discord `message.send` implementation sees the `status: 'pending'`
attachment, fetches `sourceUrl` itself, and sends it as multipart on the
message-create call. Response -- exactly one message, attachment now
finalized:

```json
{
  "message": {
    "id": "1102938999887766",
    "channelId": "1102938475610",
    "author": { "userId": "B02", "userName": "metorial-bot", "fullName": "Metorial", "type": "app", "isMe": true },
    "body": {
      "parts": [{ "type": "markdown", "markdown": "Architecture diagram attached." }],
      "attachments": [
        {
          "type": "image",
          "name": "diagram.png",
          "mimeType": "image/png",
          "size": 93482,
          "status": "complete",
          "providerFileReference": { "attachmentId": "1102938999887999" },
          "clientReferenceId": "upload-2"
        }
      ]
    },
    "metadata": { "sentAt": "2026-01-22T14:05:00.000Z", "edited": false }
  }
}
```

### Shape C -- Telegram

`file.upload` call:

```json
{
  "channelId": "-100123456789",
  "filename": "invoice.pdf",
  "mimeType": "application/pdf",
  "fileUrl": "https://uploads.metorial.com/signed/f_9f10...?exp=1755878400",
  "fileSize": 204800,
  "clientReferenceId": "upload-3"
}
```

`file.upload` response -- Telegram's `sendDocument` created a real message,
so both `attachment` and `message` are populated:

```json
{
  "attachment": {
    "type": "file",
    "name": "invoice.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "status": "complete",
    "providerFileReference": { "fileId": "BAACAgUAAxkBAAIC..." },
    "clientReferenceId": "upload-3"
  },
  "message": {
    "id": "5821",
    "channelId": "-100123456789",
    "author": { "userId": "bot123", "userName": "metorial_bot", "fullName": "Metorial", "type": "app", "isMe": true },
    "body": {
      "parts": [],
      "attachments": [
        {
          "type": "file",
          "name": "invoice.pdf",
          "status": "complete",
          "providerFileReference": { "fileId": "BAACAgUAAxkBAAIC..." },
          "clientReferenceId": "upload-3"
        }
      ]
    },
    "metadata": { "sentAt": "2026-01-22T14:10:00.000Z", "edited": false }
  }
}
```

If the caller also has text to send alongside the file, it either passes
the text as the caption on the `file.upload` call (if the adapter supports
that) or calls `message.send` separately for the text -- but `message.send`
itself never touches attachments for this shape, and never uploads
anything. If there is no separate text to send, `message.send` is simply
not called at all; the `file.upload` call above is the entire operation.

If the caller uploads three files in one logical "send text + 3 files"
operation, it makes three `file.upload` calls, gets back three `message`
values, and groups them together on its own side. The Telegram adapter
does not need to know this grouping happened.

Separately, on the **inbound** side: if a user posts an album of three
photos in Telegram, the adapter's webhook handling will receive three
separate `sendPhoto`-equivalent updates sharing one `media_group_id`. The
adapter should set `groupId: "<media_group_id>"` on each of the three
`Message` objects it produces from that webhook, so Metorial's
orchestration layer can recognize they belong together. This is unrelated
to the outbound grouping above -- it is purely about correlating messages
the adapter did not create itself.

## Don't do this

- **Never** have `message.send` return more than one message. This is a
  hard invariant of this package: `messageResultSchema` always contains
  exactly one `message`, for every provider, full stop. Multi-message
  fan-out (e.g. "one text message plus N file messages") is handled
  entirely by the caller, via repeated `file.upload` calls -- never by
  `message.send`.
- **Never** populate `file.upload`'s `message` field unless your provider
  truly created a real, independently addressable message as a side effect
  of the upload (Shape C). For Shape A and Shape B, leave it undefined.
- **Never** have a Shape B `file.upload` implementation contact the
  provider or produce a `$attachments`/slate-hub-tracked artifact. Nothing
  was actually stored at that point -- doing so would create an orphaned
  resource that no message ever ends up referencing.
- **Never** invent new top-level fields on `attachmentRefSchema`,
  `uploadFile`'s input/output, or `messageSchema` without updating this
  document.
