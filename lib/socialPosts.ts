import { promises as fs } from "fs";
import path from "path";

export type SocialPost = {
  id: string;
  createdAt: string;
  fact: string;
  caption: string;
  description: string;
  hashtags: string[];
  imageUrl?: string;
  status: "draft" | "ready" | "scheduled" | "posted";
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "social-posts.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

export async function listPosts(): Promise<SocialPost[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(posts: SocialPost[]) {
  await ensureFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(posts, null, 2), "utf8");
}

export async function createPost(
  data: Omit<SocialPost, "id" | "createdAt" | "status"> & {
    status?: SocialPost["status"];
  }
): Promise<SocialPost> {
  const posts = await listPosts();
  const post: SocialPost = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: data.status ?? "draft",
    fact: data.fact,
    caption: data.caption,
    description: data.description,
    hashtags: data.hashtags,
    imageUrl: data.imageUrl,
  };
  posts.unshift(post);
  await writeAll(posts);
  return post;
}

export async function updatePost(
  id: string,
  patch: Partial<Omit<SocialPost, "id" | "createdAt">>
): Promise<SocialPost | null> {
  const posts = await listPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  posts[idx] = { ...posts[idx], ...patch };
  await writeAll(posts);
  return posts[idx];
}

export async function deletePost(id: string): Promise<boolean> {
  const posts = await listPosts();
  const next = posts.filter((p) => p.id !== id);
  if (next.length === posts.length) return false;
  await writeAll(next);
  return true;
}
