-- Rename the auth-provider key column clerkId -> auth_id as part of migrating
-- from Clerk to Argus (OIDC). Fresh-start migration: existing rows keep their
-- old provider id in auth_id (harmless — those users re-authenticate through
-- Argus, whose `sub` differs, producing a new JIT-created row). No data is
-- dropped; the relational graph (chats/messages FK to users.id) is untouched.
ALTER TABLE "users" RENAME COLUMN "clerkId" TO "auth_id";
ALTER INDEX "users_clerkId_key" RENAME TO "users_auth_id_key";
