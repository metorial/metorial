# Conversion Tools

The integration provides file upload, conversion discovery, asynchronous conversion,
website capture, task history and retention control, file metadata, downloads, and
account identity.

Use an API token from the [profile page](https://conversiontools.io/profile).
Authentication uses the Bearer scheme at `https://api.conversiontools.io/v1`.
There are no OAuth scopes or refresh tokens. The optional sandbox setting requests
sample conversions without consuming conversion quota.

## Workflow

1. Upload Base64-encoded source bytes with `upload_file`, or supply a public source
   URL in `convert_file.conversionOptions`.
2. Use `list_conversions` to discover the standard catalog and account-specific
   custom converters. Options include their provider identifiers and details.
3. Run `convert_file`, or use `capture_website` for PDF/JPG/PNG capture. Either tool
   can wait for completion. Callbacks use the caller's HTTP(S) endpoint.
4. Check `get_task` until SUCCESS or ERROR. Failed task details remain readable.
   Successful conversion and status tools provide the downloadable result.
5. `download_file` can retrieve a file later by its result ID. Downloads remain
   subject to provider retention and plan limits.

`list_tasks` returns up to 50 recent tasks, optionally filtered by status. Source
and result metadata are omitted when the provider supplies no corresponding file;
explicit null result metadata remains null. `get_file_info` separates available
text preview lines from the provider's plan-size restriction flag.

`get_account` returns the authenticated account email. `manage_task` updates
retention or requests deletion. Deletion is scheduled by the provider and requires
a paid plan; the tool returns the provider's confirmation without claiming files
have already been removed. There are no inbound triggers.

Website capture retains its public yes/no choices, lowercase orientation values,
and margins in millimeters. These are translated to provider booleans, title-case
orientations, `pagesize`, `emulate_device`, and CSS-pixel margins. Numeric inputs
retain their number type; invalid dimensions and negative margins are rejected.

## References

- [Official API documentation](https://conversiontools.io/api-documentation)
- [Official OpenAPI specification](https://api.conversiontools.io/openapi.yaml)
- [Official SDK API implementation](https://github.com/conversiontools/conversiontools-node/tree/main/src/api)
- [Official SDK response types](https://github.com/conversiontools/conversiontools-node/blob/main/src/types/config.ts)
- [Official SDK conversion options](https://github.com/conversiontools/conversiontools-node/blob/main/src/types/conversions.ts)

Local build/schema checks establish package compatibility. Provider acceptance,
file delivery, callback delivery, and quota behavior require live verification.
