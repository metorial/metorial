# <img src="logo.svg" height="20"> Doppler Marketing Automation

Manage Doppler email marketing lists, subscribers, custom fields, campaigns, HTML content, and recipients. Start subscriber imports and monitor their asynchronous tasks. Retrieve account resources, search account subscribers, review campaign performance, and list unsubscribed contacts. Download campaign HTML as a file. Configure HTML and recipient lists before sending a campaign immediately or on a schedule.

## Setup

Supply an API key from Doppler Control Panel → Advanced Preferences → Doppler API and configure the account email used to sign in. The key is sent in the Authorization header. This integration is for fromdoppler.com email marketing.

## Campaign workflow

Create a draft with `manage_campaigns`, set its HTML with `set_campaign_content`, replace its recipient selection with `set_campaign_recipients`, and then send it with `manage_campaigns`. `get_campaign_recipients` and `download_campaign_content` let you inspect the setup.

Subscriber lists and account searches return one page at a time. Use `get_subscribers` with `updatedAfter` for account changes; the list-subscriber endpoint does not support date filters. Bulk imports return a task ID for `get_task` and optionally notify an HTTP callback.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
