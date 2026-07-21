"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUpdateProfile } from "@/queries";
import type { User } from "@/api";

// Client-side avatar guardrails, mirroring the server (images only, 5 MB).
// Kept local — the shared uploadApi validators also allow PDFs/Excel, which
// don't make sense for a profile picture.
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const AVATAR_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";
const AVATAR_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function validateAvatar(file: File): string | null {
  if (!AVATAR_MIME.has(file.type)) {
    return "Unsupported image type. Use JPEG, PNG, GIF, or WebP.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Image is too large (max 5 MB).";
  }
  return null;
}

// Modal to edit the current user's profile: change display name and/or upload a
// new avatar. Mirrors NewGroupDialog's overlay shell. The avatar uploads to S3
// via PATCH /api/user; on success the ["user"] cache updates so the Navbar
// reflects the change immediately. Rendered/dismissed by ProfileButton.
const ProfileDialog = ({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) => {
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState(user.name ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke the object URL when the picked file changes or the dialog unmounts,
  // so we don't leak blob URLs.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!picked) return;
    const problem = validateAvatar(picked);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setFile(picked);
  };

  const trimmedName = name.trim();
  const nameChanged = trimmedName !== "" && trimmedName !== (user.name ?? "");
  const canSave =
    !updateProfile.isPending && (nameChanged || file !== null);

  const handleSave = async () => {
    if (!canSave) return;
    setError(null);
    try {
      await updateProfile.mutateAsync({
        ...(nameChanged ? { name: trimmedName } : {}),
        ...(file ? { photo: file } : {}),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't update your profile.",
      );
    }
  };

  const shownAvatar = preview ?? user.photo;
  const initial = (user.name?.[0] ?? "?").toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-lg border border-white/10 bg-brand-sidebar shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Edit profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {/* Avatar with an overlaid change button */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60"
              aria-label="Change profile picture"
            >
              <Avatar className="size-20">
                <AvatarImage src={shownAvatar} alt={user.name} />
                <AvatarFallback className="bg-brand-dark text-xl text-white">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="size-5 text-white" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-brand-accent hover:underline"
            >
              Change photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              onChange={pickFile}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="profile-name"
              className="text-xs font-medium text-white/70"
            >
              Display name
            </label>
            <input
              id="profile-name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="h-9 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-brand-accent/60 focus:bg-black/30"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
          <Button variant="ghost" onClick={onClose} className="text-white/70">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {updateProfile.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileDialog;
