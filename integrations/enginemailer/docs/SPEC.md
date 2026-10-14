# Enginemailer API integration

Authenticate with an API key from Manage account → API Keys. Current subscriber, campaign, and transactional REST endpoints use the `APIKey` request header. No OAuth or connection configuration fields are required.

## Subscribers

Add or update, find, activate, deactivate, delete, tag, and untag subscribers. Discover numeric subcategory IDs with `list_subcategories` and custom field keys with `list_custom_fields`. Subscriber insertion and updates send numeric subcategory IDs. Updates map Overwrite to category mode 3/custom-field mode 1 and Append to category mode 1/custom-field mode 0. Ignore preserves an existing subscriber without a write. A failed lookup only permits insertion when the provider explicitly reports a missing subscriber; auth and service failures stop the operation.

## Transactional emails

Send HTML content or a prebuilt template through REST V2. Template sends may omit subject and sender display name; the sending email must match the template. CC/BCC inputs remain comma-separated strings and are converted to JSON arrays for the API. Limits are 10 CC addresses, 3 BCC addresses, and 5 MB of total file content. Substitution values cannot contain braces or brackets. The response exposes the provider's transaction ID.

## Campaigns

Create/update, send/schedule/pause, delete, and list undelivered campaigns. Creation exposes the campaign ID for later operations. Optional reply-to addresses are supported. Recipient assignment uses FilterBy 1 for all subscribers or 2 for numeric subcategory IDs, with nested Data and AND/OR matching. Scheduling uses `ddMMyyyy hh:mmtt`; the provider requires future times in 15-minute intervals. Campaign operations require a paid account.

`list_campaigns` retrieves the complete undelivered list; optional page/pageSize perform local slicing because the documented endpoint has no pagination parameters. `get_campaign_delivery_status` retrieves sent, delivered, bounce, open, unique-open, click, unique-click, unsubscribe, and spam-complaint counts for delivered campaigns. Other campaign states are rejected by the provider.

## Errors

HTTP failures and provider Result failure envelopes become user-facing service errors. Successful responses preserve provider data and identifiers. No event handlers are registered by this integration.

## Official references

- [Subscriber getting started](https://enginemailer.zendesk.com/hc/en-us/articles/360000733792-Subscriber-REST-API-GETTING-STARTED)
- [Insert subscriber](https://enginemailer.zendesk.com/hc/en-us/articles/360000736852-Insert-Subscriber)
- [Update subscriber](https://enginemailer.zendesk.com/hc/en-us/articles/360000737212-Update-Subscriber)
- [Transactional REST V2](https://enginemailer.zendesk.com/hc/en-us/articles/23132996552473-Submitting-Transactional-Emails-via-REST-API-Version-2)
- [Campaign getting started](https://enginemailer.zendesk.com/hc/en-us/articles/360003129972-Campaign-REST-API-GETTING-STARTED)
- [Create campaign](https://enginemailer.zendesk.com/hc/en-us/articles/360003152791-Create-Campaign)
- [Update campaign](https://enginemailer.zendesk.com/hc/en-us/articles/360003138412-Update-Campaign)
- [Assign recipients](https://enginemailer.zendesk.com/hc/en-us/articles/360003213092-Assign-Recipient-List)
- [List campaigns](https://enginemailer.zendesk.com/hc/en-us/articles/360003924151-List-Campaign)
- [Campaign delivery statistics](https://enginemailer.zendesk.com/hc/en-us/articles/63060555223065-Get-Campaign-Delivery-Status)
- [Connector API](https://connect.enginemailer.com/n8n/index.html)
