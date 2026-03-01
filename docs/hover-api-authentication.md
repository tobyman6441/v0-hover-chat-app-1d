# Hover API Authentication

This document contains the authentication documentation for the Hover API. Reference: https://developers.hover.to

## Overview

Hover uses OAuth 2.0 Authorization Code Grant Type for authentication. The flow consists of three main steps:

1. Get Authorization Code (user consent)
2. Generate Access Token (exchange code for tokens)
3. Refresh Access Token (when access token expires)

---

## 1. Get Authorization Code

**Endpoint:** `GET https://hover.to/oauth/authorize`

This is the initial step in authenticating with the Hover API. This request initiates the user consent process and generates an authorization code.

### User Interaction Required

This step cannot be automated and requires direct user interaction:

1. The user must log into their Hover account and click the "Allow" button to grant your application access to their Hover organization's data.
2. When your application submits an authorization request, the user will be presented with a Hover login and consent screen in their browser.

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `response_type` | Yes | Value is always `code` |
| `client_id` | Yes | The Client ID value of your integration |
| `redirect_uri` | Yes | The URL where the OAuth service redirects after authorization |

### Redirection and Authorization Code Retrieval

After the user grants permission, their browser will be redirected to the `redirect_uri` you specified. The authorization code will be included as a query parameter:

```
https://your-redirect-uri.com/?code={authorization_code}
```

**Important:** Authorization Codes expire after 10 minutes.

---

## 2. Generate Access Token

**Endpoint:** `POST https://hover.to/oauth/token`

This endpoint exchanges an authorization code for an `access_token` and `refresh_token` pair.

### Request Body

```json
{
  "grant_type": "authorization_code",
  "code": "your_authorization_code_here",
  "redirect_uri": "your_redirect_uri_here",
  "client_id": "your_client_id_here",
  "client_secret": "your_client_secret_here"
}
```

### Response Body

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOnsi",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "q90aLQhunR_JZ1MQ0kivxtAV",
  "scope": "all",
  "created_at": 1750191095,
  "owner_id": 785,
  "owner_type": "orgs"
}
```

### Token Expiration

**Access Tokens are valid for 2 hours (7200 seconds) from when they are generated.** Once expired, API requests with the existing token will throw an error. You must use the refresh token to obtain a new access/refresh token pair.

---

## 3. Refresh Access Token

**Endpoint:** `POST https://hover.to/oauth/token/`

This endpoint allows your application to obtain a new `access_token` (and a new `refresh_token`) by exchanging an expired access token's associated refresh token.

### Request Body

```json
{
  "grant_type": "refresh_token",
  "refresh_token": "your_current_refresh_token_here",
  "client_id": "your_client_id_here",
  "client_secret": "your_client_secret_here"
}
```

### Response Body

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOnsi",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "q90aLQhunR_JZ1MQ0kivxtAV",
  "scope": "all",
  "created_at": 1750191095,
  "owner_id": 785,
  "owner_type": "orgs"
}
```

### Benefits of Token Refresh

- **Maintain Continuous Access:** Acquire a new `access_token` when the current one expires, preventing interruptions.
- **Automated Token Management:** Automate the process of obtaining new access credentials, eliminating the need for repeated user logins.

---

## Environment Variables

Your application needs the following environment variables for Hover OAuth:

| Variable | Description |
|----------|-------------|
| `HOVER_CLIENT_ID` | The Client ID from your Hover integration |
| `HOVER_CLIENT_SECRET` | The Client Secret from your Hover integration |

---

## Implementation Notes

1. Store both `access_token` and `refresh_token` securely in your database
2. Track the `expires_in` value to know when to refresh tokens
3. Implement automatic token refresh before making API calls when the token is expired
4. The `owner_id` in the response represents the Hover organization ID
5. The `owner_type` is typically `"orgs"` for organization-level access
