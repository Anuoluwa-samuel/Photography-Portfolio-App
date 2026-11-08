# Deploying to Oracle Cloud (Always Free)

The site runs on one free Oracle VM as two Docker containers: the app (`server.js`) and
**Caddy**, which serves HTTPS and renews the certificate on its own. The files are in
`deploy/oracle/`.

The database stays on **Turso** and the photos stay on **Vercel Blob**, so the VM holds no data
and nothing has to be copied across. There is no 4.5 MB upload limit here (uploads go up to 25 MB
per photo).

Keep the Vercel deployment running until step 8. Moving the domain is the last step.

---

## 1. Create the account

Sign up at <https://signup.cloud.oracle.com>. It asks for a card to verify identity; Always Free
resources are never charged.

**The home region is permanent.** Pick **UK South (London)**: it is close to the Turso database
(Ireland) and a reasonable hop from Lagos.

## 2. Create the VM

Menu → **Compute → Instances → Create instance**.

| Setting | Value |
|---|---|
| Image | **Canonical Ubuntu 24.04** |
| Shape | **Ampere → VM.Standard.A1.Flex**, 2 OCPU, 12 GB memory (free up to 4 OCPU / 24 GB) |
| Networking | create a new VCN with a **public subnet**, and **assign a public IPv4 address** |
| SSH keys | **Upload public key** → your `~/.ssh/id_ed25519.pub` (`ssh-keygen -t ed25519` if you have none) |

If it says **"Out of capacity"**, try a different availability domain, or try again later; free
Ampere capacity comes and goes. Do not fall back to the 1 GB AMD shape: the build needs more memory.

Note the instance's **Public IP address**.

## 3. Open ports 80 and 443

Two firewalls must allow them.

**In Oracle:** Instance → the subnet → **Security List** → **Add Ingress Rules**, twice:
source `0.0.0.0/0`, TCP, destination port `80`; then the same for `443`.

**On the VM:** Oracle's Ubuntu image ships with its own iptables rules that block everything
except SSH. SSH in and open the ports:

```bash
ssh ubuntu@<PUBLIC_IP>
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 4. Install Docker and get the code

Still on the VM:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && exit        # log out so the group applies
```

```bash
ssh ubuntu@<PUBLIC_IP>
git clone https://github.com/Anuoluwa-samuel/Photography-Portfolio-App.git site
cd site
```

If the repository is private, create a read-only deploy key or a fine-grained token on GitHub first.

## 5. Create `.env` on the VM

```bash
nano .env
```

Copy the **production** values from Vercel → Project → **Settings → Environment Variables**:

```
NODE_ENV=production
SITE_URL=https://yit0shotit.com
SESSION_SECRET=<same as Vercel, so the admin stays signed in; or a new one: openssl rand -hex 32>
TURSO_DATABASE_URL=<from Vercel>
TURSO_AUTH_TOKEN=<from Vercel>
BLOB_READ_WRITE_TOKEN=<from Vercel>
ADMIN_USERNAME=<from Vercel>
SMTP_HOST=… SMTP_PORT=… SMTP_USER=… SMTP_PASS=… MAIL_FROM=… NOTIFY_EMAIL=…   (if set on Vercel)
```

```bash
chmod 600 .env
```

## 6. Start it on a test address

Before touching the domain, run it on `sslip.io`, a free service that maps a name to your IP so
Caddy can get a real certificate. Write the IP with dashes:

```bash
cd deploy/oracle
DOMAIN=<1-2-3-4>.sslip.io docker compose up -d --build     # first build takes a few minutes
```

Open `https://<1-2-3-4>.sslip.io`. Check the home page, a project page, and log in at `/admin`.
Canonical links and the sitemap still say yit0shotit.com, which is expected.

## 7. Point the domain at the VM

The domain's nameservers currently point at Vercel DNS. Either:

- **Keep Vercel DNS** (simplest): Vercel → **Domains → yit0shotit.com → DNS records**. Remove the
  domain from the Vercel *project* first, then add `A @ <PUBLIC_IP>` and `A www <PUBLIC_IP>`.
- **Leave Vercel entirely:** in Whogohost → **Manage Nameservers** → **Use default nameservers**,
  then in Whogohost's **Manage DNS** add the same two `A` records. Copy across any other records you
  have in Vercel DNS first (MX for email, TXT for verification), or they stop working.

Then, on the VM, restart Caddy on the real domain:

```bash
cd ~/site/deploy/oracle
docker compose up -d          # DOMAIN defaults to yit0shotit.com
```

Caddy gets the certificate as soon as DNS reaches the VM (minutes to a few hours).

## 8. Shut down Vercel

Only once `https://yit0shotit.com` loads from the VM (`curl -sI https://yit0shotit.com` shows
`server: Caddy` in the response headers). Delete or pause the Vercel project. **Keep the Blob store**:
the photos live there.

---

## Updating the site

After pushing to GitHub:

```bash
ssh ubuntu@<PUBLIC_IP>
cd ~/site && git pull && cd deploy/oracle && docker compose up -d --build
```

## Useful commands

```bash
docker compose ps                  # both containers should be "running"
docker compose logs -f web         # app logs
docker compose logs -f caddy       # certificate / HTTPS logs
docker compose restart web
```

## Keeping it free

Oracle may reclaim Always Free VMs that sit **idle** (CPU, network and memory all very low for
7 days). A live website with visitors is normally not idle; if you get a reclamation email,
upgrading the account to Pay As You Go removes the rule and Always Free resources still cost
nothing.
