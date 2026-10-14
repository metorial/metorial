# AppDrag Integration

## Service availability

AppDrag has stopped accepting new customers and projects and announced permanent shutdown on November 1, 2026. Existing projects may use this integration while the service remains available. See the [sunset notice](https://support.appdrag.com/doc/Sunset-of-AppDrag) and [project migration guide](https://support.appdrag.com/doc/Download-website-from-AppDrag).

## Authentication

The connection uses an API key and a configured App ID. The App ID is the project's public subdomain in `https://{appId}.appdrag.site`, rather than an undiscoverable account identifier. Find both values in the CloudBackend Portal's API dashboard.

Provider commands include `APIKey` and `appID` as URL-encoded form fields. Calls to project functions send parameters in the query string for GET and in the URL-encoded form body for other supported methods. The connection's credentials take precedence over function parameters.

## Tools

| Key | Operation |
| --- | --- |
| `execute_sql_query` | Run a query through `CloudDBGetDataset` or `CloudDBExecuteRawQuery`. |
| `execute_api_function` | Call an existing function at `/api/{folder}/{function}`. |
| `manage_files` | Write text, delete, rename, copy, or save a remote file to project storage. |
| `manage_directories` | Create, list, rename, or delete stored directories. |
| `send_email` | Send transactional email from a verified sender. |
| `manage_newsletter_contacts` | Add or remove contacts from newsletter lists. |
| `get_failed_emails` | Retrieve failed newsletter deliveries, optionally since a date. |
| `delete_newsletter_list` | Delete a newsletter mailing list by its name. |

Database, transactional email, file, and directory commands use `https://api.appdrag.com/CloudBackend.aspx`. Newsletter commands use `https://api.appdrag.com/Zapier.aspx`, matching AppDrag's official SDK. Existing provider response shapes are retained without inferring a uniform response envelope.

`manage_files` saves files into the provider's project storage; it does not return downloaded file bytes. `execute_api_function` calls existing functions and does not create or configure them. Blog and shop management are outside the implemented tool surface.

## Sources

- [Official SDK documentation](https://github.com/AppDrag/appdrag-cloudbackend)
- [Official SDK payload implementation](https://github.com/AppDrag/appdrag-cloudbackend/blob/master/index.js)
- [Cloud Backend overview](https://support.appdrag.com/doc/Cloud-Backend-Overview)
- [API documentation export](https://support.appdrag.com/doc/Export-Documentation)
- [Transactional email example](https://academy.appdrag.com/FullStack-with-cloud-backend-Episode-4.html)
