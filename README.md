# Konn3ct Dashboard Frontend

This repository is the React dashboard frontend for Konn3ct. It includes authentication, protected dashboard pages, room management, streaming, recordings, plans and payments, donations onboarding, attendance reporting, event registration, profile settings, and a public join-room flow.

## What Is Running Today

- React 18 with Create React App
- React Router using `createBrowserRouter`
- React Query for page-level data fetching and mutations
- Tailwind CSS with custom UI primitives in `src/components/ui`
- `i18next` for translations
- Google, Facebook, and Apple social auth wiring
- Theme switching through `ThemeProvider`

## App Entry Flow

The runtime starts in [src/index.js](/c:/Users/HP/Desktop/k_dashboard_frontend/src/index.js) and wraps the app in this order:

1. `ThemeProvider`
2. `GoogleOAuthProvider`
3. `QueryClientProvider`
4. `AuthProvider`
5. `GlobalErrorBoundary`
6. `GlobalNetworkGuard`
7. `App`
8. `Toaster`

Routing lives in [src/App.js](/c:/Users/HP/Desktop/k_dashboard_frontend/src/App.js).

Public routes:

- `/login`
- `/register`
- `/forgot-password`
- `/join`
- `/view-profile`

Protected routes:

- `/`
- `/rooms`
- `/profile`
- `/streams`
- `/recordings`
- `/payments`
- `/addons`
- `/referees`
- `/donations`
- `/attendance`
- `/attendance-details/:meeting_id/:identifier`
- `/events/*`
- `/events/participants/:reference`
- `/history`
- `/history/new`
- `/settings`
- `/notifications`
- `/dashboard/schedule/new`
- `/dashboard/rooms/new`

Protected pages render through `IsAuthenticated`, which checks the user loaded from `localStorage` by `AuthProvider`.

## Data and API Flow

The main API client is [src/api/index.js](/c:/Users/HP/Desktop/k_dashboard_frontend/src/api/index.js).

- Base URL comes from `REACT_APP_BASE_URL`
- The bearer token is read from `localStorage`
- Most feature modules under `src/api/` use this shared client

There are two notable exceptions:

- [src/api/authService.js](/c:/Users/HP/Desktop/k_dashboard_frontend/src/api/authService.js) uses `axios` directly with `REACT_APP_BASE_URL`
- [src/api/attendanceApi.js](/c:/Users/HP/Desktop/k_dashboard_frontend/src/api/attendanceApi.js) uses `fetch` against `REACT_APP_API_BOT` for attendance AI endpoints

Join-room flow:

1. `/join` submits to `joinRoom` in `src/api/roomsApi.js`
2. Numeric room names post to `/join-room`
3. Non-numeric room names post to `/kv4/join-room`
4. The returned session token is passed to `buildJoinMeetingUrl`
5. The final meeting URL is built from `REACT_APP_JOIN_MEETING_URL`

## Main Feature Areas

- Auth: email/password login, registration, forgot password, social login
- Dashboard: profile summary, room stats, upcoming meetings, quick actions
- Rooms: list, create, start, join, transfer, limits, access code, banner upload
- Streaming: stream creation and stop actions
- Recordings: list, playback links, download links, delete actions
- Payments and add-ons: plan purchase flows using Paystack
- Donations: individual and business verification flows
- Attendance: meeting attendance list, participant detail view, exports, AI summary/highlights/minutes
- Events: event creation, participant export, reminders
- Profile: profile editing, password update, active sessions, referral display
- Settings: language and theme selection

## Environment Variables In Use

This is a CRA app, so every `REACT_APP_*` value is bundled client-side.

Core API and app URLs:

- `REACT_APP_BASE_URL`
- `REACT_APP_BASE_BACKENED_URL`
- `REACT_APP_API_BOT`
- `REACT_APP_JOIN_MEETING_URL`
- `REACT_APP_LANDING_URL`
- `REACT_APP_SITE_URL`

Social auth and SDKs:

- `REACT_APP_CLIENT_ID`
- `REACT_APP_GOOGLE_USERINFO_URL`
- `REACT_APP_FACEBOOK_APP_ID`
- `REACT_APP_FACEBOOK_SDK_URL`
- `REACT_APP_APPLE_CLIENT_ID`
- `REACT_APP_APPLE_REDIRECT_URI`
- `REACT_APP_APPLE_SIGNIN_SDK_URL`

Payments and media:

- `REACT_APP_PAYSTACK_KEY`
- `REACT_APP_PLAYBACK_URL`
- `REACT_APP_RECORDING_DOWNLOAD_BASE`
- `REACT_APP_VIDEO_DOWNLOAD_BASE`

Branding and links:

- `REACT_APP_PRIVACY_POLICY_URL`
- `REACT_APP_FAVICON_URL`
- `REACT_APP_OG_IMAGE_URL`
- `REACT_APP_GETTING_STARTED_VIDEO_URL`
- `REACT_APP_CONTACT_SALES_URL`

Optional document/font/analytics values referenced by `public/index.html`:

- `REACT_APP_GOOGLE_FONTS_PRECONNECT_URL`
- `REACT_APP_GOOGLE_FONTS_STATIC_URL`
- `REACT_APP_GOOGLE_FONTS_STYLESHEET_URL`
- `REACT_APP_GOOGLE_ANALYTICS_SCRIPT_URL`
- `REACT_APP_GOOGLE_ANALYTICS_ID`

## Project Structure

```text
src/
  api/           Feature API modules
  assets/        Images, SVGs, icon components
  components/    Shared UI and layout pieces
  constants/     Static app constants
  hooks/         Auth, theme, SDK, toast, mobile hooks
  i18n/          Translation bootstrap
  lib/           Route guard and helper utilities
  pages/         Route-level screens
  providers/     Global providers
  App.js         Router
  index.js       App bootstrap
public/
  locales/       Translation files
```

## Development

```bash
npm install
npm start
```

Other scripts:

```bash
npm run build
npm test
```

## Deployment

The repo includes:

- `Dockerfile` for a multi-stage frontend build
- `default.conf` for nginx SPA fallback with `try_files $uri $uri/ /index.html;`

## Inactive Or Placeholder Areas

These are the places I found that are inactive, static, or clearly placeholder-driven right now:

- [src/pages/Notifications.jsx](/c:/Users/HP/Desktop/k_dashboard_frontend/src/pages/Notifications.jsx): uses `mockNotifications` in component state and does not call any backend.
- [src/pages/AttendanceUpgrade.jsx](/c:/Users/HP/Desktop/k_dashboard_frontend/src/pages/AttendanceUpgrade.jsx): fully static sample attendance screen and not routed anywhere from `src/App.js`.
- [src/pages/auth/Login.jsx](/c:/Users/HP/Desktop/k_dashboard_frontend/src/pages/auth/Login.jsx): the SSO button only fires a toast and does not start a real SSO flow.
- [src/pages/Settings.jsx](/c:/Users/HP/Desktop/k_dashboard_frontend/src/pages/Settings.jsx): only the `general` tab is active; meeting, recording, audio, whiteboard, and scheduling tabs are commented out.
- [src/pages/view-profile/profileData.js](/c:/Users/HP/Desktop/k_dashboard_frontend/src/pages/view-profile/profileData.js): contains static sample profile content, fake session pricing, duplicate time slots, and social links pointing to `#`.
- [src/pages/view-profile/ViewProfile.jsx](/c:/Users/HP/Desktop/k_dashboard_frontend/src/pages/view-profile/ViewProfile.jsx): renders from the static `profileData.js` module rather than live API data.
- [src/components/PricingCard.jsx](/c:/Users/HP/Desktop/k_dashboard_frontend/src/components/PricingCard.jsx): appears unused and contains test-style copy such as `A test Feature`.
- [src/components/StatCard.jsx](/c:/Users/HP/Desktop/k_dashboard_frontend/src/components/StatCard.jsx): appears unused in the current routed UI.
- [src/App.js](/c:/Users/HP/Desktop/k_dashboard_frontend/src/App.js): the topbar search input is present visually but has no search handler or query logic attached.
- [src/App.js](/c:/Users/HP/Desktop/k_dashboard_frontend/src/App.js): topbar profile identity is hardcoded as `Admin User` and `admin@konn3ct.com`.

## Notes Worth Cleaning Up Later

- [src/api/userApi.js](/c:/Users/HP/Desktop/k_dashboard_frontend/src/api/userApi.js), [src/api/recordingApi.js](/c:/Users/HP/Desktop/k_dashboard_frontend/src/api/recordingApi.js), [src/lib/utils.js](/c:/Users/HP/Desktop/k_dashboard_frontend/src/lib/utils.js), and social auth pages still include debug `console.log` calls.
- The repo uses both `REACT_APP_BASE_URL` and the misspelled `REACT_APP_BASE_BACKENED_URL`; both are live references.
- A checked-in `.env` file exists, and these values should be treated as public client config, not secrets.

## Summary

The core dashboard flows are wired and production-shaped, but there are still a few clearly demo or incomplete surfaces around notifications, SSO, settings expansion, and the public profile showcase page. This README is now aligned to the actual code paths that are active today.
