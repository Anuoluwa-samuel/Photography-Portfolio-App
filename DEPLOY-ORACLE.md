# Deploying to Oracle Cloud (on the PlayBot server)

The site runs on the existing **PlayBot** Oracle VM (`instance-20261003-2200`, Always Free,
4 OCPU / 24 GB) as two Docker containers, using the files in `deploy/oracle/`:

- **web**: the app (`server.js`), capped at 1 CPU and 1.5 GB so it can't starve PlayBot.
- **tunnel**: a **Cloudflare Tunnel**. It makes an outgoing connection to Cloudflare, and
  Cloudflare serves `https://yit0shotit.com` through it. The server opens **no ports** and
  manages no certificates, the same model PlayBot already uses.

It runs as its own Compose project (`yito-shot-it`) in its own folder, so PlayBot's deploys,
restarts and backups never touch it, and the reverse is also true.

The database stays on **Turso** and the photos on **Vercel Blob**, so nothing has to be copied.
There is no 4.5 MB upload limit (Cloudflare allows 100 MB; the app allows 25 MB per photo).

Keep the Vercel deployment running until step 8. Moving the nameservers is the switch-over.

---

## 1. Get onto the server

The PlayBot server only accepts SSH over **Tailscale**. Open the Tailscale app on the Mac and
make sure it's connected, then:

```bash
ssh -i ~/.ssh/playbot_oracle ubuntu@playbot
```

## 2. Get the code

```bash
sudo mkdir -p /srv/yito && sudo chown ubuntu:ubuntu /srv/yito
git clone https://github.com/Anuoluwa-samuel/Photography-Portfolio-App.git /srv/yito/app
cd /srv/yito/app
```

## 3. Create `.env`

```bash
nano /srv/yito/app/.env
```

Copy the **production** values from Vercel → Project → **Settings → Environment Variables**:

```
NODE_ENV=production
SITE_URL=https://yit0shotit.com
SESSION_SECRET=<same as Vercel, so the admin stays signed in>
TURSO_DATABASE_URL=<from Vercel>
TURSO_AUTH_TOKEN=<from Vercel>
BLOB_READ_WRITE_TOKEN=<from Vercel>
ADMIN_USERNAME=<from Vercel>
SMTP_HOST=… SMTP_PORT=… SMTP_USER=… SMTP_PASS=… MAIL_FROM=… NOTIFY_EMAIL=…   (if set on Vercel)
```

```bash
chmod 600 /srv/yito/app/.env
```

## 4. Trial run on a temporary address

A "quick tunnel" needs no Cloudflare account and gives a random `trycloudflare.com` URL:

```bash
cd /srv/yito/app/deploy/oracle
touch tunnel.env
docker compose --profile test up -d --build web quick-tunnel     # first build: a few minutes
docker compose logs quick-tunnel | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com'
```

Open that URL. Check the home page and a project page, log in at `/admin`, and upload a large
photo. Then stop the trial tunnel:

```bash
docker compose --profile test rm -sf quick-tunnel
```

## 5. Put the domain on Cloudflare

**Cloudflare dashboard → Add a domain** → `yit0shotit.com` → **Free** plan.

Cloudflare copies the existing DNS records, which currently point at Vercel. In
**DNS → Records**:

- **Delete** the `A`/`CNAME` records for `yit0shotit.com` and `www`. The tunnel replaces them in
  step 6.
- **Keep** everything else (MX for email, TXT for verification).

Note the two **Cloudflare nameservers** it shows. Don't change them at Whogohost yet.

## 6. Create the tunnel

**Cloudflare → Zero Trust → Networks → Tunnels → Create a tunnel**:

1. Type **Cloudflared**, name `yito-shot-it` (separate from PlayBot's tunnel), **Save tunnel**.
2. Copy **only the token**: the long `eyJ…` text after `--token`. Don't run the commands shown.
3. **Public hostname**, add two:
   - Domain `yit0shotit.com`, subdomain empty → Service **HTTP**, URL `web:3000`
   - Subdomain `www`, domain `yit0shotit.com` → Service **HTTP**, URL `web:3000`

Then **Rules → Redirect Rules → Create rule → from template "Redirect from WWW to root"** →
Deploy, so `www` sends visitors to the main address.

On the server:

```bash
cd /srv/yito/app/deploy/oracle
nano tunnel.env          # one line: TUNNEL_TOKEN=eyJ…
chmod 600 tunnel.env
docker compose up -d --build
```

In Zero Trust, the tunnel should change to **Healthy** within a minute.

## 7. Switch the nameservers

**Whogohost → yit0shotit.com → Manage Nameservers → Use custom nameservers** → enter the two
Cloudflare nameservers from step 5 (replacing `ns1/ns2.vercel-dns.com`) → **Change Nameservers**.

Cloudflare emails you when the domain is **Active** (minutes to a few hours). From then on,
visitors reach the Oracle server.

## 8. Shut down Vercel

Once `https://yit0shotit.com` is served by the tunnel (`curl -sI https://yit0shotit.com` shows
`server: cloudflare`, not `server: Vercel`), remove the domain from the Vercel project, then
delete or pause the project. **Keep the Blob store**: the photos live there.

---

## Updating the site

After pushing to GitHub (with Tailscale connected):

```bash
ssh -i ~/.ssh/playbot_oracle ubuntu@playbot 'cd /srv/yito/app && git pull && cd deploy/oracle && docker compose up -d --build'
```

## Useful commands

Run them in `/srv/yito/app/deploy/oracle`. Because they name this project only, PlayBot is never affected.

```bash
docker compose ps                  # web and tunnel should be "running"
docker compose logs -f web         # app logs
docker compose logs -f tunnel      # connection to Cloudflare
docker compose restart web
```
