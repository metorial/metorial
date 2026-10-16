# Pushbullet Integration

Send notes, links, and files; manage devices, chats, channels, and subscriptions;
queue SMS/MMS through a connected Android phone; and share clipboard text.

## Authentication

Use an access token from [Account Settings](https://www.pushbullet.com/#settings/account)
or authorize an OAuth client. Requests authenticate with the `Access-Token`
header. OAuth uses the authorization-code flow and the documented token
exchange. Pushbullet tokens have no fixed expiry and no refresh-token flow;
reconnect when a token is revoked. `get_current_user` identifies the connected
account and its maximum upload size.

## Tools

| Tool | Purpose |
| --- | --- |
| `get_current_user` | Read the connected account and upload-size limit. |
| `send_push` | Send a note, link, or uploaded file to one target or all own devices. |
| `list_pushes` | Page through push history and synchronize changes. |
| `manage_push` | Dismiss or delete a push. |
| `list_devices` | Discover registered device IDs and SMS capability. |
| `manage_device` | Create, update, or delete a device registration. |
| `send_sms` | Queue SMS/MMS through an Android device with SMS permission. |
| `list_chats` | Page through chats and contact details. |
| `manage_chat` | Create, mute, unmute, or delete a chat. |
| `create_channel` | Create a broadcast channel, optionally linked to an RSS feed. |
| `list_subscriptions` | Page through channel subscriptions. |
| `manage_subscription` | Subscribe, mute, unmute, or unsubscribe. |
| `get_channel_info` | Read a channel by tag, optionally including recent pushes. |
| `send_clipboard` | Share unencrypted clipboard text with connected devices. |
| `request_file_upload` | Request upload authorization and the resulting file URL. |

## Pagination and synchronization

All list tools accept `cursor`, `limit`, `modifiedAfter`, and `activeOnly`.
Use each returned cursor to request the next page. Limits must be whole numbers
from 1 to 500. To synchronize, retain provider modification timestamps instead
of using the local clock. Setting `activeOnly` to false includes deleted records;
those records retain their ID, active flag, and timestamps while other fields
can be absent. Pushbullet also omits empty response fields.

## Files and messages

For a file push or MMS, request an upload URL, POST the file to that URL using
multipart/form-data with a `file` field, then pass its resulting file URL to the
sending tool. Upload authorization alone does not upload the file. File pushes
also return a downloadable file. Existing file URL fields remain available.

Each push can have one target: a device ID from `list_devices`, an email, or a
channel tag. Omitting a target broadcasts to the connected account's devices.
Link pushes need a URL; file pushes need the file name, MIME type, and URL.
MMS files need both MIME type and file URL. Text records expire after one hour,
including sent records. Clipboard sharing resolves the sender's user ID from
the connected account. This integration does not implement encrypted clipboard
messages, notification mirroring, or a realtime event trigger.

## Official API references

- [API responses, pagination, and deleted objects](https://docs.pushbullet.com/#api-overview)
- [OAuth](https://docs.pushbullet.com/#oauth2)
- [User identity](https://docs.pushbullet.com/#get-user)
- [Pushes](https://docs.pushbullet.com/#push)
- [Devices](https://docs.pushbullet.com/#device)
- [Chats](https://docs.pushbullet.com/#chat)
- [Channel creation](https://docs.pushbullet.com/#create-channel)
- [Subscriptions](https://docs.pushbullet.com/#subscription)
- [SMS/MMS](https://docs.pushbullet.com/#create-text)
- [Clipboard](https://docs.pushbullet.com/#universal-copypaste)
- [Uploads](https://docs.pushbullet.com/#upload-request)
