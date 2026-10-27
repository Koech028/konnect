# LinkUp API

Django REST API for the LinkUp React frontend. The app uses Django JWT authentication and connects frontend account, profile, feed, messaging, notification, and safety flows to the API.

## Project layout

```text
backend/
  config/                 Django project settings, root URLs, ASGI/WSGI
  apps/
    accounts/             User model, registration, JWT, password reset
    profiles/             Profile editing, photos, verification requests
    posts/                Feed posts, likes, comments, polls
    matching/             Profile likes and mutual matches
    messaging/             Match conversations
    livestreams/           Live video rooms, credit wallets, and gifts
    community/              24-hour stories and dating events
    notifications/         Notifications and notification preferences
    safety/               Blocks and user reports
  manage.py
  requirements.txt
```

## Run locally (Windows PowerShell)

From the repository root:

```powershell
Set-Location .\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py createsuperuser
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

The development email backend writes password-reset messages to the server console. Configure `DJANGO_EMAIL_BACKEND` and an email provider before sending real email. The API allows the Vite origin `http://localhost:3000` by default. Edit `.env` to change `DJANGO_SECRET_KEY`, `FRONTEND_ORIGIN`, or `FRONTEND_PASSWORD_RESET_URL`.

## Database and media provider configuration

PostgreSQL is the right fit for the app's relational user, profile, post, like, match, and message data. Supabase PostgreSQL can host the database. Put its PostgreSQL connection string in `DATABASE_URL`; local development uses SQLite when `DEBUG=true` and no URL is set. Django currently handles passwords and JWT authentication; setting Supabase Auth keys alone does not change that. The React app still contains demo/local-storage data flows, so those must be connected to the API before this is a complete production application.

Cloudflare R2 credentials are server-only configuration. Authenticated active users request short-lived, content-type/size-bound upload URLs from `POST /api/v1/media/upload-url/`. The browser uploads media bytes directly to R2 with `PUT`; Django does not proxy or persist file bytes. Images support JPEG, PNG, or WebP up to 5 MB. Videos support MP4, WebM, or QuickTime up to 50 MB. The returned HTTPS URL is then saved in the API for a profile photo, photo/event post, video post, story, or Short. Short/story/post videos are limited to 60 seconds by the frontend duration check, and the API validates the declared duration where applicable. Actual file contents/duration are not inspected or transcoded on the server.

For local or production uploads, set `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET`, and `CLOUDFLARE_R2_PUBLIC_URL` in the backend environment. The public URL must be HTTPS. Configure the bucket CORS policy to allow `PUT` from each exact frontend origin (for example `http://localhost:3000` and the deployed `https://...` origin), allow the `Content-Type` request header, and expose `ETag` if the client needs it. Keep the R2 access keys only on the backend. If these settings are absent, upload URL requests return HTTP 503; they are not silently stored on the application server.

Live camera and microphone capture happen in the browser via LiveKit WebRTC; Django issues join tokens but does not receive camera files or media streams. Hosts need a configured LiveKit Cloud/server URL and API credentials in `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`, with the secret kept backend-only. The browser must be on HTTPS or localhost and the host must grant camera/microphone permissions. The room controls allow the host to enable/disable each device. Without LiveKit credentials, start/join returns HTTP 503; without browser permission or a secure origin, the room can connect without host media and displays the relevant error.

## Deploying with Render

`render.yaml` defines a Django API and a static frontend. Create a Render Blueprint from the repository, then set the prompted environment values. The `backend/.env.example` is for local development; production secrets are entered in Render's environment settings and must not be committed:

1. Create a Supabase project and paste its PostgreSQL connection string into `DATABASE_URL`. URL-encode special characters in the password and require SSL (`sslmode=require`). For Render's IPv4 network, use Supabase's session pooler if the direct database host is not reachable.
2. Set `DJANGO_ALLOWED_HOSTS` to the API hostname only. Set `FRONTEND_ORIGIN` and `CSRF_TRUSTED_ORIGINS` to the deployed frontend origin (`https://...`), and `FRONTEND_PASSWORD_RESET_URL` to its reset route.
3. Configure SMTP host, username, password, and a verified sender address. Production startup intentionally fails if required SMTP credentials are missing.
4. Use Render's generated `DJANGO_SECRET_KEY`; set the R2 credentials after creating the bucket and a public custom media domain. Keep R2 credentials private.
5. Set `VITE_API_BASE_URL` to the API origin. This frontend uses the Django JWT endpoints for authentication; Supabase Auth is not part of the current implementation.

The API deployment runs migrations as its release command, serves Django static assets through WhiteNoise, forces HTTPS, and has a database-connected health check. Production mode refuses to start without a secret key, PostgreSQL URL, allowed host, and SMTP credentials. Back up the database, configure Supabase network access and R2 CORS/public access policy deliberately, and set up monitoring before opening registration to users.

Health check: `GET http://127.0.0.1:8000/health/`

## Authentication

All `/api/v1/` endpoints require an access token except registration, login, and password reset. Send:

```http
Authorization: Bearer <access>
```

Access tokens expire after 30 minutes; refresh tokens last 7 days.

### `POST /api/v1/auth/register/`

Accepts `email`, `password`, `display_name`, `age` (18+), `gender`, optional `bio`, `interests`, and either a `location: {city, country}` object or flat `city` / `country` fields. Returns `{user, access, refresh}`.

### `POST /api/v1/auth/login/`

Accepts `{email, password}`. Returns `{user, access, refresh}`.

### `POST /api/v1/auth/refresh/`

Accepts `{refresh}` and returns a refreshed token pair.

### `GET /api/v1/auth/me/`

Returns the current user.

### Password reset

* `POST /api/v1/auth/password-reset/` with `{email}` sends a one-time reset link. Responses do not disclose whether an account exists.
* `POST /api/v1/auth/password-reset/confirm/` with `{uid, token, password}` validates the token and changes the password.

The React app currently has the password-request screen only. Add a `/reset-password` screen that reads `uid` and `token` from the emailed URL before wiring this confirmation endpoint to the UI.

## Endpoint map

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/v1/profiles/me/` | Read the current profile |
| PATCH | `/api/v1/profiles/me/` | Edit profile fields, location, interests, preferences, or visibility |
| GET | `/api/v1/profiles/{user_id}/` | Read an active public profile |
| GET | `/api/v1/discover/?q=&gender=&age_min=&age_max=&verified=&shared_interests=` | Search/filter active profiles; includes shared interest and same-city signals |
| GET, POST | `/api/v1/profiles/me/photos/` | List or add photo URL records (maximum 6) |
| PATCH, DELETE | `/api/v1/profiles/me/photos/{photo_id}/` | Update or remove an owned photo |
| POST | `/api/v1/media/upload-url/` | Request a short-lived authenticated R2 image or video upload URL |
| GET, POST | `/api/v1/profiles/me/verification/` | Read or submit a verification request |
| GET, POST | `/api/v1/posts/` | Paginated feed or create a post |
| GET, PATCH, DELETE | `/api/v1/posts/{post_id}/` | Read or manage an owned post |
| POST | `/api/v1/posts/{post_id}/like/` | Toggle the current user's post like |
| POST | `/api/v1/posts/{post_id}/interest/` | Toggle the current user's interest in a post |
| GET, POST | `/api/v1/posts/{post_id}/comments/` | List or add comments |
| POST | `/api/v1/posts/{post_id}/poll-vote/` | Vote using `option_id` or `option_index` |
| POST, DELETE | `/api/v1/likes/` | Like or unlike a profile (`user_id`) |
| GET | `/api/v1/likes/incoming/` | Profiles that liked the current user |
| GET | `/api/v1/likes/outgoing/` | Profiles liked by the current user |
| GET | `/api/v1/matches/` | Paginated matches |
| GET | `/api/v1/matches/{match_id}/` | Read a match |
| GET, POST | `/api/v1/matches/{match_id}/messages/` | List or send match messages |
| GET, POST | `/api/v1/matches/{match_id}/messages/activity/` | Read typing state or update your typing status |
| GET | `/api/v1/notifications/` | Paginated notifications |
| POST | `/api/v1/notifications/read-all/` | Mark all notifications read |
| POST | `/api/v1/notifications/{notification_id}/read/` | Mark one notification read |
| GET, PATCH | `/api/v1/settings/notifications/` | Read/update notification preferences |
| GET | `/api/v1/settings/push/config/` | Read the public browser-push key |
| GET, POST, DELETE | `/api/v1/settings/push/subscription/` | Read, register, or remove your browser push subscription |
| GET, POST | `/api/v1/stories/` | List active stories or create a 24-hour story |
| DELETE | `/api/v1/stories/{story_id}/` | Delete your own story |
| GET, POST | `/api/v1/shorts/` | Browse recent Shorts or publish a short video |
| GET, DELETE | `/api/v1/shorts/{short_id}/` | Read a Short or delete your own |
| POST | `/api/v1/shorts/{short_id}/watch/` | Record one view per signed-in user |
| POST | `/api/v1/shorts/{short_id}/like/` | Toggle a like |
| GET, POST | `/api/v1/shorts/{short_id}/comments/` | List or add comments |
| GET, POST | `/api/v1/prompts/today/` | Read or save your private daily prompt answer |
| GET, POST | `/api/v1/events/` | List upcoming events or create one |
| GET, POST | `/api/v1/events/{event_id}/` | Read an event or toggle your RSVP |
| GET | `/api/v1/premium/` | Read your current premium tier and entitlements |
| GET, POST | `/api/v1/safety/blocks/` | List or block profiles (`user_id`) |
| DELETE | `/api/v1/safety/blocks/{block_id}/` | Unblock a profile |
| GET, POST | `/api/v1/safety/reports/` | List or submit a report |
| GET, POST | `/api/v1/safety/content-reports/` | List your reports or report a Short/comment for staff review |
| GET, POST | `/api/v1/live/` | List live streams or start one |
| GET | `/api/v1/live/wallet/` | Read virtual credit balance and gift catalog |
| GET | `/api/v1/live/{stream_id}/` | Read a live stream |
| POST | `/api/v1/live/{stream_id}/join/` | Get a short-lived LiveKit room token |
| POST | `/api/v1/live/{stream_id}/end/` | End a stream (host only) |
| POST | `/api/v1/live/{stream_id}/gifts/` | Send a virtual gift using credits |

## Discovery and conversations

Discovery responses include `shared_interests` and `same_city` signals. The optional `shared_interests=true` query limits results to profiles sharing at least one interest. Results prioritize shared interests, then same-city profiles and recent activity. This is not a distance or compatibility guarantee; the app does not currently store precise coordinates.

New match conversations show optional icebreaker suggestions based on shared interests, or general first-message ideas when none overlap. A suggestion only fills the draft; users choose whether to edit and send it.

## Live video and virtual gifts

For the simplest setup, create a LiveKit Cloud project and copy its server URL, API key, and API secret into `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in `backend/.env`. Restart Django after changing the file. For deployment, set the same three variables as secrets on the `linkup-api` service. Never expose the API secret to the browser. A stream is unavailable until these settings are present. Only the host receives publish permissions; signed-in viewers receive subscribe-only video access. Account blocks also hide and prevent joining each other's streams.

New wallets start with 100 virtual credits. Roses cost 10 credits, hearts 25, and stars 50; gifts transfer credits to the host. Credits have no cash value, are not purchasable, and cannot be withdrawn. These starter credits are a launch/testing system, not a payment or payout feature.

## Stories, events, verification, and premium

Stories can contain text, an image, or a short video and expire after 24 hours. Shorts are videos up to 60 seconds in the client, with likes, comments, and deduplicated signed-in views. Both use the signed R2 upload flow; images are capped at 5 MB, and MP4, WebM, and QuickTime uploads at 50 MB. Upload URL requests are throttled and require an active account. Video duration is checked in the browser and the declared duration is validated by the API; upload processing/transcoding and server-side media inspection are not included. Blocking an author hides their stories and Shorts and prevents interactions.

Shorts and their comments can be reported from the feed. A user can submit one report per item; reports are private to the reporter and are available to staff in Django Admin for review.

The daily conversation prompt changes each day. Answers are private to the account and can be edited during that day; participation is optional. Events are visible to signed-in users, use a public venue description, and support capacity-limited RSVPs. Blocking a host hides their events and prevents event access.

Verification requests are reviewed by staff in Django Admin. Select pending requests and use **Approve selected verification requests** or **Reject selected verification requests**; users are notified of the decision. This flow deliberately does not collect identity documents.

Premium status is an administrator-managed entitlement during this beta. It adds the profile badge; there is no checkout, billing, or self-service promotion. Set the user's subscription tier in Django Admin only when granting premium.

Browser push uses the standard Web Push protocol. Generate a VAPID key pair from the backend virtual environment with `.\.venv\Scripts\vapid.exe --gen --json --applicationServerKey`. Put the public and private keys in the local `backend/.env` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`, and set `VAPID_CLAIMS_EMAIL` to a real contact email. The public key is exposed only through the authenticated configuration endpoint; never put the private key in frontend variables. Serve the frontend over HTTPS (localhost is supported for development) and users can enable push in Settings. Invalid/expired browser subscriptions are removed automatically.

On Render, set the three VAPID values once as secrets for the `linkup-api` service in `render.yaml`; the frontend does not need a VAPID build variable. Include the application's sender email (for example, `support@example.com`) as `VAPID_CLAIMS_EMAIL`. Do not commit either key.

## Request/response shapes

Posts use the frontend's nested `content` contract:

```json
{
  "type": "poll",
  "content": {
    "text": "Choose a weekend plan",
    "media": [],
    "poll_options": ["Hike", "Coffee"]
  }
}
```

Post responses include `author_id`, nested `author`, `content`, `engagement`, `liked_by_me`, `interested_by_me`, and `created_at`. Poll content also includes `poll_option_ids` and `poll_votes`. Post feed and match lists use DRF pagination (`count`, `next`, `previous`, `results`).

Profile responses contain the UI's `location: {city, country}`, `photos` URL list, `avatar`, `interests`, `preferences`, and status fields. The API accepts profile and post image URLs returned by the authenticated R2 upload-URL endpoint.

## Important boundaries before launch

* Verification decisions require authorized staff review. Do not upload identity documents through this feature.
* Reports are stored for staff review; blocking immediately hides profiles and prevents further likes/messages.
* Email reset delivery uses the console backend locally. Configure and test real delivery before production.
* Rate limits and JWT authentication are enabled, but production still needs HTTPS, a production database, secret management, backups, monitoring, and deployment hardening.

## Checks and tests

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test
```
