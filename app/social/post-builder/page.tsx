"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";

type SocialPost = {
  id: string;
  createdAt: string;
  fact: string;
  caption: string;
  description: string;
  hashtags: string[];
  imageUrl?: string;
  status: "draft" | "ready" | "scheduled" | "posted";
};

export default function PostBuilderPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [niche, setNiche] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/social-posts")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {});
  }, []);

  async function onExtract(file: File) {
    setError(null);
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("page", file);
      if (niche.trim()) fd.append("niche", niche.trim());
      const r = await fetch("/api/social-posts/extract", {
        method: "POST",
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Extraction failed");
      setPosts((prev) => [d.post, ...prev]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExtracting(false);
      if (pageInputRef.current) pageInputRef.current.value = "";
    }
  }

  function applyPatch(updated: SocialPost) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    const r = await fetch(`/api/social-posts?id=${id}`, { method: "DELETE" });
    if (r.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Social Post Builder"
        subtitle="Photograph a fact → Claude writes the post → upload your image → ready for Canva."
      />

      <section className="mb-8 p-5 border border-gray-200 rounded-lg bg-white">
        <h2 className="text-base font-semibold text-ink mb-3">
          1. Photograph a book / calendar page
        </h2>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-text mb-1">
              Audience / niche (optional)
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. Dog-friendly travel, history buffs, parents"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text mb-1">Page photo</label>
            <input
              ref={pageInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={extracting}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onExtract(f);
              }}
              className="text-sm"
            />
          </div>
        </div>
        {extracting && (
          <p className="mt-3 text-sm text-accent">
            Reading fact and drafting post…
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section>
        <h2 className="text-base font-semibold text-ink mb-3">
          2. Posts ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <div className="p-8 border border-dashed border-gray-300 rounded-lg text-center text-sm text-text">
            No posts yet. Upload a page photo above to start.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                onChange={applyPatch}
                onDelete={() => onDelete(p.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PostCard({
  post,
  onChange,
  onDelete,
}: {
  post: SocialPost;
  onChange: (p: SocialPost) => void;
  onDelete: () => void;
}) {
  const [caption, setCaption] = useState(post.caption);
  const [description, setDescription] = useState(post.description);
  const [hashtags, setHashtags] = useState(post.hashtags.join(" "));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const dirty =
    caption !== post.caption ||
    description !== post.description ||
    hashtags !== post.hashtags.join(" ");

  async function save() {
    setSaving(true);
    try {
      const tags = hashtags
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith("#") ? t : `#${t}`));
      const r = await fetch("/api/social-posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.id,
          caption,
          description,
          hashtags: tags,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        onChange(d.post);
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("id", post.id);
      fd.append("image", file);
      const r = await fetch("/api/social-posts/image", {
        method: "POST",
        body: fd,
      });
      const d = await r.json();
      if (r.ok) onChange(d.post);
      else alert(d.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function setStatus(status: SocialPost["status"]) {
    const r = await fetch("/api/social-posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, status }),
    });
    const d = await r.json();
    if (r.ok) onChange(d.post);
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="text-xs text-text">
          {new Date(post.createdAt).toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={post.status}
            onChange={(e) => setStatus(e.target.value as SocialPost["status"])}
            className="text-xs px-2 py-1 border border-gray-300 rounded"
          >
            <option value="draft">draft</option>
            <option value="ready">ready</option>
            <option value="scheduled">scheduled</option>
            <option value="posted">posted</option>
          </select>
          <button
            onClick={onDelete}
            className="text-xs text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-text mb-1">
          Fact
        </div>
        <div className="text-sm text-ink bg-gray-50 rounded px-3 py-2 border border-gray-100">
          {post.fact}
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs uppercase tracking-wide text-text">
          Caption (image overlay)
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          className="mt-1 w-full text-sm px-3 py-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-3">
        <label className="text-xs uppercase tracking-wide text-text">
          Description (post body)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="mt-1 w-full text-sm px-3 py-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-3">
        <label className="text-xs uppercase tracking-wide text-text">
          Hashtags (space-separated)
        </label>
        <input
          type="text"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          className="mt-1 w-full text-sm px-3 py-2 border border-gray-300 rounded"
        />
      </div>

      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-text mb-1">
          Image
        </div>
        {post.imageUrl ? (
          <div className="flex items-start gap-3">
            <img
              src={post.imageUrl}
              alt=""
              className="w-32 h-32 object-cover rounded border border-gray-200"
            />
            <label className="text-xs text-accent hover:underline cursor-pointer">
              Replace
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                }}
              />
            </label>
          </div>
        ) : (
          <label className="block w-full p-4 border border-dashed border-gray-300 rounded text-center text-sm text-text cursor-pointer hover:border-accent hover:text-accent">
            {uploading ? "Uploading…" : "Click to upload image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
              }}
            />
          </label>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs text-text">
          {savedAt && !dirty && Date.now() - savedAt < 4000 ? "Saved" : ""}
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="px-4 py-2 text-sm rounded bg-accent text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
