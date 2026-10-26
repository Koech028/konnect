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
    notifications/        Notifications and notification preferences
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

Cloudflare R2 credentials are server-only configuration. Authenticated users can request short-lived upload URLs from `POST /api/v1/media/upload-url/` for JPEG, PNG, or WebP images up to 5 MB. The browser uploads directly to R2, then the image URL is saved with the profile or post. Configure a public HTTPS custom domain for the bucket and R2 CORS to allow browser `PUT` requests from the frontend origin. The endpoint enforces supported content type and size, and scopes object keys to the requesting user.

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
| GET | `/api/v1/discover/?q=&gender=&age_min=&age_max=&verified=` | Search/filter active profiles |
| GET, POST | `/api/v1/profiles/me/photos/` | List or add photo URL records (maximum 6) |
| PATCH, DELETE | `/api/v1/profiles/me/photos/{photo_id}/` | Update or remove an owned photo |
| POST | `/api/v1/media/upload-url/` | Request a short-lived authenticated R2 image upload URL |
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
| GET | `/api/v1/notifications/` | Paginated notifications |
| POST | `/api/v1/notifications/read-all/` | Mark all notifications read |
| POST | `/api/v1/notifications/{notification_id}/read/` | Mark one notification read |
| GET, PATCH | `/api/v1/settings/notifications/` | Read/update notification preferences |
| GET, POST | `/api/v1/safety/blocks/` | List or block profiles (`user_id`) |
| DELETE | `/api/v1/safety/blocks/{block_id}/` | Unblock a profile |
| GET, POST | `/api/v1/safety/reports/` | List or submit a report |

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

* Verification requests are pending records only. Do not send identity documents to this API; connect a secure verification provider and review workflow first.
* Reports are stored for staff review; blocking immediately hides profiles and prevents further likes/messages.
* Email reset delivery uses the console backend locally. Configure and test real delivery before production.
* Rate limits and JWT authentication are enabled, but production still needs HTTPS, a production database, secret management, backups, monitoring, and deployment hardening.

## Checks and tests

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test
```
