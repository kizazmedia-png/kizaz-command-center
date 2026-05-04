import { SiteId } from "./sites";

export interface WordPressCreds {
  url: string;
  user: string;
  password: string;
}

export function getWordPressCreds(site: SiteId): WordPressCreds {
  const upper = site.toUpperCase();
  const url = process.env[`WORDPRESS_URL_${upper}`];
  const user = process.env[`WORDPRESS_USER_${upper}`];
  const password = process.env[`WORDPRESS_PASSWORD_${upper}`];
  if (!url || !user || !password) {
    throw new Error(
      `WordPress credentials not configured for site "${site}". Set WORDPRESS_URL_${upper}, WORDPRESS_USER_${upper}, WORDPRESS_PASSWORD_${upper}.`
    );
  }
  return {
    url: url.replace(/\/+$/, ""),
    user,
    password,
  };
}

export function basicAuthHeader(creds: WordPressCreds): string {
  const token = Buffer.from(`${creds.user}:${creds.password}`).toString(
    "base64"
  );
  return `Basic ${token}`;
}
