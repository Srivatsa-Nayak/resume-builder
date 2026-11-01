// Minimal OAuth 2.0 authorization-code flow for Google and GitHub.

export type OAuthProviderId = "google" | "github";

export interface OAuthProfile {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
}

interface ProviderConfig {
  id: OAuthProviderId;
  name: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientId?: string;
  clientSecret?: string;
  fetchProfile(accessToken: string): Promise<OAuthProfile>;
}

function providers(): Record<OAuthProviderId, ProviderConfig> {
  return {
    google: {
      id: "google",
      name: "Google",
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      async fetchProfile(accessToken) {
        const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error("Could not load Google profile");
        const p = (await res.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
        if (!p.email) throw new Error("Your Google account has no email address");
        return { providerAccountId: p.sub, email: p.email, emailVerified: !!p.email_verified, name: p.name ?? null, image: p.picture ?? null };
      },
    },
    github: {
      id: "github",
      name: "GitHub",
      authorizeUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      scope: "read:user user:email",
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      async fetchProfile(accessToken) {
        const headers = { Authorization: `Bearer ${accessToken}`, "User-Agent": "resume-builder", Accept: "application/vnd.github+json" };
        const res = await fetch("https://api.github.com/user", { headers });
        if (!res.ok) throw new Error("Could not load GitHub profile");
        const p = (await res.json()) as { id: number; login: string; name?: string | null; avatar_url?: string };
        const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
        const emails = emailsRes.ok ? ((await emailsRes.json()) as { email: string; primary: boolean; verified: boolean }[]) : [];
        const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
        if (!primary) throw new Error("Your GitHub account has no verified email address");
        return { providerAccountId: String(p.id), email: primary.email, emailVerified: true, name: p.name || p.login, image: p.avatar_url ?? null };
      },
    },
  };
}

export function isOAuthProvider(id: string): id is OAuthProviderId {
  return id === "google" || id === "github";
}

export function getProvider(id: OAuthProviderId): ProviderConfig | null {
  const provider = providers()[id];
  return provider.clientId && provider.clientSecret ? provider : null;
}

/** Providers with credentials configured, for rendering sign-in buttons. */
export function configuredProviders(): { id: OAuthProviderId; name: string }[] {
  return Object.values(providers())
    .filter((p) => p.clientId && p.clientSecret)
    .map((p) => ({ id: p.id, name: p.name }));
}

export function appUrl(request: Request): string {
  return (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export function callbackUrl(request: Request, id: OAuthProviderId): string {
  return `${appUrl(request)}/api/auth/oauth/${id}/callback`;
}

export function authorizationUrl(provider: ProviderConfig, redirectUri: string, state: string): string {
  const url = new URL(provider.authorizeUrl);
  url.searchParams.set("client_id", provider.clientId!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", provider.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  if (provider.id === "google") url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeCode(provider: ProviderConfig, code: string, redirectUri: string): Promise<string> {
  const res = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: provider.clientId!,
      client_secret: provider.clientSecret!,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !body.access_token) throw new Error(body.error_description || "Token exchange failed");
  return body.access_token;
}
