# Deploy RealCred on a Hostinger VPS

The `devlopment` branch contains the source. The `production` branch contains `backend/`, including the compiled website in `backend/dist/`. Express serves the React app and `/api` on the same origin.

## Publish a new build

From the repository root on `devlopment`, install the frontend dependencies and generate the backend bundle.

```sh
npm --prefix cred/frontend ci
npm --prefix cred/frontend run build:backend
git add cred/backend/dist
git commit -m "Build RealCred website for deployment"
git push origin devlopment
```

From a clean checkout of `production` with the updated `devlopment` ref available, sync the deployable folder. This also stages deletion of retired build assets.

```sh
git restore --source=devlopment:cred --staged --worktree -- backend
git diff --cached --stat
git commit -m "Release RealCred"
git push origin production
```

## Run the release on Ubuntu

Provision Node.js 22 or 24, Git, Nginx and Certbot with its Nginx plugin. Use a non-root service account and give it read access to the release and write access to a persistent private document directory. With read access to the Git repository, clone the deploy branch and install runtime dependencies.

```sh
git clone --branch production --single-branch https://github.com/Ayush8700944365/loanWebsite.git realcred
cd realcred/backend
npm ci --omit=dev
```

Use `.env.example` to create an owner-readable `.env` inside `backend/`. Set the following values and keep the production database credentials and keys on the server. For a new database, generate separate values for the JWT and PII keys with `openssl rand -hex 32`. Preserve the PII encryption key for existing encrypted data.

```dotenv
NODE_ENV=production
APP_HOST=127.0.0.1
PORT=5000
CLIENT_URL=https://realcred.in
MONGO_URI=mongodb+srv://YOUR_ATLAS_CONNECTION_STRING
JWT_SECRET=YOUR_JWT_SECRET
PARTNER_PII_ENCRYPTION_KEY=YOUR_PII_KEY
DOCUMENT_STORAGE_PATH=/var/lib/realcred/documents
```

Grant the MongoDB database user access to `loanCRM` or the database set in `MONGO_DB_NAME`. For Atlas, allow access from the VPS IP. Set the verified sender and Resend API key from `.env.example` to enable password-reset email. To bootstrap the first administrator, run `npm run create-admin` on the VPS.

Run `npm start` from `backend/` and confirm `curl -fsS http://127.0.0.1:5000/api/health` reports `ready`. For persistent operation, run the same entry point under a `systemd` service. Adjust the working directory and Node executable to match the VPS.

```ini
[Unit]
Description=RealCred
After=network-online.target
Wants=network-online.target

[Service]
User=realcred
WorkingDirectory=/opt/realcred/backend
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Save the unit as `/etc/systemd/system/realcred.service`, then run `sudo systemctl daemon-reload` and `sudo systemctl enable --now realcred`. For subsequent releases, pull `production` with `git pull --ff-only`, run `npm ci --omit=dev` in `backend/`, and restart the service.

## Connect the domain and enable HTTPS

In GoDaddy, open `realcred.in` and select **DNS**. Set `A` record `@` to the Hostinger VPS public IPv4 and set `CNAME` record `www` to `realcred.in`. Replace conflicting website records for these two names and preserve the email records. These steps assume the domain uses GoDaddy nameservers. [Hostinger VPS DNS guide](https://www.hostinger.com/support/1583227-how-to-point-a-domain-to-your-vps-at-hostinger/) · [GoDaddy DNS guide](https://www.godaddy.com/help/manage-dns-records-680)

Enable an Nginx site for both names using the following initial configuration. Allow inbound HTTP and HTTPS on the VPS firewall. Express listens on loopback.

```nginx
server {
    listen 80;
    server_name realcred.in www.realcred.in;
    client_max_body_size 64m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

After both names resolve to the VPS, validate and reload Nginx, then issue a certificate for both names. [Ubuntu Certbot guide](https://ubuntu.com/server/docs/how-to/security/obtain-tls-certificates/)

```sh
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx --redirect -d realcred.in -d www.realcred.in
```

In the resulting HTTPS server block, add the following above `location /` and reload Nginx. This keeps sign-in and password-reset links on the canonical origin.

```nginx
if ($host = www.realcred.in) {
    return 301 https://realcred.in$request_uri;
}
```

Verify `https://realcred.in/`, a directly loaded route such as `https://realcred.in/contact`, and `https://realcred.in/api/health`.
