"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, KeyRound, Lock, LockOpen, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import {
  changeMemberRole,
  createMemberAccount,
  inviteMember,
  removeMember,
  setProjectAccess,
  setProjectRestricted,
} from "@/app/(app)/team/actions";
import { FormAlert } from "@/app/(auth)/auth-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, NativeSelect } from "@/components/ui/input";
import type { Role } from "@/lib/types";
import { initials } from "@/lib/utils";

export interface MemberRow {
  id: string;
  userId: string;
  role: Role;
  joinedAt: string;
  name: string;
  username: string | null;
  email: string | null;
  jobTitle: string | null;
  isOwner: boolean;
  isSelf: boolean;
}

function RoleSelect({ name = "role", defaultValue = "member" }: { name?: string; defaultValue?: Role }) {
  return (
    <NativeSelect id={name} name={name} defaultValue={defaultValue}>
      <option value="member">Member: mengelola konten produksi</option>
      <option value="admin">Admin: juga mengelola tim & akses</option>
    </NativeSelect>
  );
}

function useCloseOnSuccess(ok: boolean | undefined, message: string | undefined, close: () => void) {
  const router = useRouter();
  useEffect(() => {
    if (ok) {
      toast.success(message ?? "Berhasil");
      close();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ok, message]);
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(inviteMember, null);
  useCloseOnSuccess(state?.ok, state?.message, onDone);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state?.ok ? null : state} />
      <Field label="Email atau username" htmlFor="identifier" error={state?.fieldErrors?.identifier}>
        <Input id="identifier" name="identifier" placeholder="nama@contoh.com atau username" autoComplete="off" required />
      </Field>
      <Field label="Role" htmlFor="role" error={state?.fieldErrors?.role}>
        <RoleSelect />
      </Field>
      <p className="text-xs text-secondary">
        Akun yang sudah terdaftar langsung ditambahkan. Email yang belum terdaftar akan menerima tautan undangan untuk membuat password.
      </p>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          <Mail /> Undang
        </Button>
      </div>
    </form>
  );
}

function CreateAccountForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(createMemberAccount, null);
  useCloseOnSuccess(state?.ok, state?.message, onDone);
  const fe = state?.fieldErrors;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state?.ok ? null : state} />
      <Field label="Nama lengkap" htmlFor="full_name" error={fe?.full_name}>
        <Input id="full_name" name="full_name" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Username" htmlFor="username" error={fe?.username}>
          <Input id="username" name="username" autoComplete="off" required />
        </Field>
        <Field label="Email" htmlFor="email" error={fe?.email}>
          <Input id="email" name="email" type="email" autoComplete="off" required />
        </Field>
      </div>
      <Field label="Password sementara" htmlFor="password" error={fe?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Role" htmlFor="role" error={fe?.role}>
        <RoleSelect />
      </Field>
      <p className="text-xs text-secondary">Berikan username dan password ini kepada anggota. Mereka bisa menggantinya di Settings.</p>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>
          <KeyRound /> Buat akun
        </Button>
      </div>
    </form>
  );
}

export function AddMemberButtons() {
  const [invite, setInvite] = useState(false);
  const [create, setCreate] = useState(false);
  return (
    <>
      <Dialog open={create} onOpenChange={setCreate}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <KeyRound /> Buat akun anggota
          </Button>
        </DialogTrigger>
        <DialogContent title="Buat akun anggota" description="Akun baru langsung aktif dan masuk ke workspace ini.">
          <CreateAccountForm onDone={() => setCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={invite} onOpenChange={setInvite}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus /> Undang anggota
          </Button>
        </DialogTrigger>
        <DialogContent title="Undang anggota" description="Tambahkan orang ke workspace ini.">
          <InviteForm onDone={() => setInvite(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MemberTable({ members, isAdmin }: { members: MemberRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [removing, setRemoving] = useState<MemberRow | null>(null);

  const onRole = (m: MemberRow, role: Role) =>
    start(async () => {
      const res = await changeMemberRole(m.id, role);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(`${m.name} sekarang ${role}.`);
        router.refresh();
      }
    });

  return (
    <>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-border text-left text-xs text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Anggota</th>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Bergabung</th>
              {isAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((m) => {
              const locked = !isAdmin || m.isOwner || m.isSelf;
              return (
                <tr key={m.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                        {initials(m.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-medium">
                          {m.name}
                          {m.isSelf && <span className="text-xs font-normal text-secondary">(Anda)</span>}
                          {m.isOwner && <Crown className="size-3.5 text-warning" aria-label="Pemilik workspace" />}
                        </div>
                        <div className="truncate text-xs text-secondary">{[m.jobTitle, isAdmin ? m.email : null].filter(Boolean).join(" · ") || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary">{m.username ? `@${m.username}` : "—"}</td>
                  <td className="px-4 py-3">
                    {locked ? (
                      <Badge tone={m.role === "admin" ? "accent" : "neutral"} className="capitalize">
                        {m.isOwner ? "Pemilik · admin" : m.role}
                      </Badge>
                    ) : (
                      <NativeSelect
                        aria-label={`Role ${m.name}`}
                        value={m.role}
                        disabled={pending}
                        onChange={(e) => onRole(m, e.target.value as Role)}
                        className="w-32"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </NativeSelect>
                    )}
                  </td>
                  <td className="px-4 py-3 text-secondary">{new Date(m.joinedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      {!m.isOwner && !m.isSelf && (
                        <Button variant="ghost" size="icon" aria-label={`Keluarkan ${m.name}`} onClick={() => setRemoving(m)}>
                          <Trash2 className="text-danger" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      {members.length === 1 && (
        <p className="mt-4 text-sm text-secondary">
          Baru ada Anda di workspace ini. {isAdmin ? "Gunakan tombol Undang anggota untuk menambah tim." : ""}
        </p>
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Keluarkan ${removing?.name ?? "anggota"}?`}
        description="Anggota kehilangan akses ke workspace ini. Akunnya dan konten yang pernah dibuatnya tetap ada."
        confirmLabel="Keluarkan"
        onConfirm={async () => {
          if (!removing) return;
          const res = await removeMember(removing.id);
          if (res?.error) toast.error(res.error);
          else {
            toast.success(`${removing.name} dikeluarkan.`);
            router.refresh();
          }
        }}
      />
    </>
  );
}

export function ProjectAccess({
  projects,
  grants,
  members,
  isAdmin,
}: {
  projects: { id: string; name: string; restricted: boolean }[];
  grants: string[];
  members: MemberRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const granted = new Set(grants);

  const run = (fn: () => Promise<{ error?: string } | null>) =>
    start(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      router.refresh();
    });

  if (projects.length === 0)
    return <EmptyState icon={Lock} title="Belum ada project" description="Buat project terlebih dahulu untuk mengatur hak aksesnya." />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary">
        Project <strong>terbuka</strong> bisa diakses semua anggota. Project <strong>terbatas</strong> hanya bisa dilihat admin dan anggota yang dipilih,
        termasuk episode, script, pertanyaan, rundown, dan catatannya.
      </p>
      {projects.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {p.restricted ? <Lock className="size-4 text-warning" /> : <LockOpen className="size-4 text-success" />}
            <span className="flex-1 font-medium">{p.name}</span>
            <Badge tone={p.restricted ? "warning" : "success"}>{p.restricted ? "Terbatas" : "Semua anggota"}</Badge>
            {isAdmin && (
              <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setProjectRestricted(p.id, !p.restricted))}>
                {p.restricted ? "Buka untuk semua" : "Batasi akses"}
              </Button>
            )}
          </div>
          {p.restricted && (
            <div className="mt-3 border-t border-border pt-3">
              {members.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-secondary">
                  <Users className="size-4" /> Belum ada anggota dengan role member. Admin selalu punya akses.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const on = granted.has(`${p.id}:${m.userId}`);
                    return (
                      <label
                        key={m.userId}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
                      >
                        <input
                          type="checkbox"
                          className="accent-accent"
                          checked={on}
                          disabled={!isAdmin || pending}
                          onChange={(e) => run(() => setProjectAccess(p.id, m.userId, e.target.checked))}
                        />
                        {m.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
