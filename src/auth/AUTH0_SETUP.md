# Auth0 Dashboard Configuration

This app uses `react-native-auth0` with the Auth0 Universal Login flow.
The following settings must be configured in your Auth0 dashboard.

## 1. Create or Select an Application

1. Go to **Applications > Applications** in the Auth0 dashboard.
2. Create a new **Native** application (or reuse the one from gryphon-central-tenant).
3. Note the **Domain** and **Client ID** from the Settings tab.

## 2. Set Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_client_id_here
AUTH0_AUDIENCE=https://your-api-identifier
```

## 3. Configure Callback URLs

In the application's **Settings** tab, add the following URLs.

### Allowed Callback URLs

```
com.periscope.offline.auth0://your-tenant.us.auth0.com/ios/com.periscope.offline/callback,
com.periscope.offline.auth0://your-tenant.us.auth0.com/android/com.periscope.offline/callback
```

### Allowed Logout URLs

```
com.periscope.offline.auth0://your-tenant.us.auth0.com/ios/com.periscope.offline/callback,
com.periscope.offline.auth0://your-tenant.us.auth0.com/android/com.periscope.offline/callback
```

Replace `your-tenant.us.auth0.com` with your actual Auth0 domain.

## 4. Configure an API (if using AUTH0_AUDIENCE)

If the app needs to call the Periscope Portal API with an access token:

1. Go to **Applications > APIs**.
2. Create or select the API that represents the Periscope Portal backend.
3. Copy its **Identifier** (audience) into the `AUTH0_AUDIENCE` env var.
4. Under the API's **Machine to Machine Applications** tab, authorize this native app.

## 5. Native Platform Notes

The `react-native-auth0` Expo plugin (configured in `app.config.ts`) automatically sets up:

- **iOS:** The callback URL scheme in `Info.plist` via the Expo plugin.
- **Android:** The callback URL scheme in `AndroidManifest.xml` via the Expo plugin.

These are derived from the `AUTH0_DOMAIN` value passed to the plugin in `app.config.ts`.
After changing `AUTH0_DOMAIN`, run `npx expo prebuild --clean` to regenerate native projects.

## 6. Grant Types

Ensure the application has the following grant types enabled:

- **Authorization Code** (with PKCE — default for native apps)

## 7. Connections

Enable at least one connection (e.g., Username-Password-Authentication, Google, etc.)
under the application's **Connections** tab so users can actually log in.
