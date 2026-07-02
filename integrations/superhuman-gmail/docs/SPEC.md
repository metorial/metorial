# Slates Specification: Superhuman Gmail

## Overview

This provider wraps the **Gmail API** with a **conversation-first** tool surface aimed at inbox triage and threaded replies—similar in spirit to fast mail clients like Superhuman—without reimplementing features that require a proprietary backend (read tracking, shared comment threads, magic snooze state, etc.). Everything maps to standard Gmail threads, labels, drafts, send, and **history**.

## Authentication

Uses **Google OAuth 2.0** (authorization code flow) against Gmail and userinfo endpoints, identical in mechanism to other Gmail-based Slates packages.

### Setup

1. Google Cloud project with **Gmail API** enabled.
2. OAuth client ID and secret; consent screen configured for requested scopes.
3. Redirect URI registered for your Slates app.

### Endpoints

- Authorize: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- Gmail REST: `https://gmail.googleapis.com/gmail/v1`

### Scopes

Offered scopes include **gmail.readonly**, **gmail.compose**, **gmail.modify**, optional **https://mail.google.com/** (for permanent thread delete), plus **userinfo.email** / **userinfo.profile** for connection identity. Triage and send flows typically need **modify** and **compose**; history polling needs read access to **history** and messages.

## Features

### Conversation search

**users.threads.list** with Gmail’s `q` syntax and optional `labelIds`, returning thread stubs for triage lists.

### Thread context

**users.threads.get** returns all messages in a thread; messages are parsed into headers and bodies. A **replyHints** object supplies **In-Reply-To**, **References**, suggested **To**, and **Re:** subject for the chosen (or latest) message.

### Triage

**users.threads.modify** applies label adds/removes for archive (remove `INBOX`), unarchive, read/unread (`UNREAD`), star (`STARRED`), and custom labels. **trash** / **untrash** use the thread trash endpoints; **delete** calls **users.threads.delete** (irreversible; may require broader OAuth scope than **modify** alone).

### Reply drafts and send

**users.drafts.create** / **update** build MIME with threading headers and optional `threadId`. **users.drafts.send** sends a draft; **send_reply** uses **users.messages.send** with `threadId` and reply headers for immediate sends.

### Conversation changes (polling)

**users.history.list** incrementally returns **messageAdded**, **messageDeleted**, **labelAdded**, and **labelRemoved** records. The trigger stores `lastHistoryId` in polling state, emits one event per history record with **threadId**, and optionally fetches metadata for new messages.

## Events

**Push (Pub/Sub)** is not configured here by design; the package uses **polling** on the history API only, avoiding Cloud Pub/Sub topic setup while remaining Gmail-native.
