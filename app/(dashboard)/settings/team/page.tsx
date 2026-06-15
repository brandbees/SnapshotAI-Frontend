"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { UserPlus, Trash2, ChevronDown, Users, Lock, AlertCircle, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import api from "@/lib/api";
import { PLAN_LABELS, PLAN_SEATS } from "@/lib/constants";
import { isValidEmail } from "@/lib/utils";
import type { TeamMember, TeamRole } from "@/types";

const ROLE_OPTIONS: { value: Exclude<TeamRole, "owner">; label: string }[] = [
  { value: "admin",   label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "analyst", label: "Analyst" },
  { value: "viewer",  label: "Viewer"  },
];

const ROLE_STYLE: Record<TeamRole, string> = {
  owner:   "bg-purple-100 text-purple-700",
  admin:   "bg-blue-100 text-blue-700",
  manager: "bg-green-100 text-green-700",
  analyst: "bg-gray-100 text-gray-600",
  viewer:  "bg-sky-100 text-sky-700",
};

function RoleBadge({ role }: { role: TeamRole }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_STYLE[role]}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

interface TeamData {
  members: TeamMember[];
  seats_used: number;
  seats_limit: number;
}

export default function TeamPage() {
  const { agency } = useAuth();
  const { roleCanDo, loading: roleLoading } = useRole();
  const [data, setData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<TeamRole, "owner">>("analyst");
  const [inviting, setInviting] = useState(false);

  const isPaidPlan = agency?.plan !== "free";
  const planLabel = agency ? PLAN_LABELS[agency.plan] : "";
  const seatLimit = agency ? (PLAN_SEATS[agency.plan] ?? 1) : 1;

  useEffect(() => {
    if (roleLoading || !roleCanDo("manage_team")) return;
    api.get<TeamData>("/team")
      .then(({ data }) => setData(data))
      .catch(() => setData({ members: [], seats_used: 1, seats_limit: seatLimit }))
      .finally(() => setLoading(false));
  }, [seatLimit, roleLoading]);

  if (!roleLoading && !roleCanDo("manage_team")) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Lock size={22} className="text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Access restricted</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Team management is only available to admins and the account owner.
          </p>
        </div>
      </div>
    );
  }

  async function handleInvite() {
    if (!inviteEmail || !isValidEmail(inviteEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setInviting(true);
    try {
      const { data: res } = await api.post<{ member: TeamMember }>("/team/invite", {
        email: inviteEmail,
        name: inviteName || undefined,
        role: inviteRole,
      });
      setData((prev) => prev ? {
        ...prev,
        members: [...prev.members, res.member],
        seats_used: prev.seats_used + 1,
      } : prev);
      setShowInvite(false);
      setInviteEmail(""); setInviteName(""); setInviteRole("analyst");
      toast.success(`Invite sent to ${inviteEmail}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to send invite.";
      toast.error(msg);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(id: string, email: string) {
    try {
      await api.delete(`/team/${id}`);
      setData((prev) => prev ? {
        ...prev,
        members: prev.members.filter((m) => m.id !== id),
        seats_used: prev.seats_used - 1,
      } : prev);
      toast.success(`${email} removed from team.`);
    } catch {
      toast.error("Failed to remove member.");
    }
  }

  async function handleRoleChange(id: string, role: Exclude<TeamRole, "owner">) {
    try {
      const { data: res } = await api.put<{ member: TeamMember }>(`/team/${id}`, { role });
      setData((prev) => prev ? {
        ...prev,
        members: prev.members.map((m) => m.id === id ? res.member : m),
      } : prev);
    } catch {
      toast.error("Failed to update role.");
    }
  }

  if (!isPaidPlan) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader title="Team" description="Invite team members to collaborate." />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-10 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Users size={20} className="text-amber-600" />
          </div>
          <p className="font-semibold text-amber-900">Team management requires a paid plan</p>
          <p className="text-sm text-amber-700 max-w-sm">
            You&apos;re on the <strong>{planLabel}</strong> plan. Upgrade to Starter or above to invite team members.
          </p>
          <Link href="/billing" className="mt-2 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors" style={{ background: "var(--accent)" }}>View Plans</Link>
        </div>
      </div>
    );
  }

  const atSeatLimit = data ? data.seats_used >= data.seats_limit : false;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader title="Team" description="Invite and manage your team members." />

      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{data?.seats_used ?? 1}</span>
            {" "}of{" "}
            <span className="font-semibold text-foreground">
              {data?.seats_limit === 9999 ? "∞" : data?.seats_limit}
            </span>
            {" "}seats used
          </p>
          {data && data.seats_limit < 9999 && (
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (data.seats_used / data.seats_limit) * 100)}%`,
                  background: atSeatLimit ? "var(--score-bad)" : "var(--accent)",
                }}
              />
            </div>
          )}
        </div>
        <Button onClick={() => setShowInvite(true)} disabled={atSeatLimit}>
          <UserPlus size={15} className="mr-1.5" />
          Invite member
        </Button>
      </div>

      {atSeatLimit && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0 text-amber-600" />
          Seat limit reached.{" "}
          <Link href="/billing" className="underline font-semibold">Upgrade your plan</Link> to invite more members.
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="font-semibold text-foreground">Invite Team Member</p>
              <button onClick={() => setShowInvite(false)} className="p-1 rounded-md text-muted-foreground hover:bg-muted">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email address *</label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name (optional)</label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
                <div className="relative">
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Exclude<TeamRole, "owner">)}
                    className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
                    {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {inviteRole === "admin" && "Can manage sites, alerts, and team members."}
                  {inviteRole === "manager" && "Can run audits and generate reports."}
                  {inviteRole === "analyst" && "View-only access to dashboards and reports."}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleInvite} loading={inviting} disabled={!inviteEmail}>
                Send invite
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Members table */}
      <Card padding="none">
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Member", "Role", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Owner row */}
                <tr>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-foreground">{agency?.name}</p>
                    <p className="text-xs text-muted-foreground">{agency?.email}</p>
                  </td>
                  <td className="px-5 py-3.5"><RoleBadge role="owner" /></td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active
                    </span>
                  </td>
                  <td className="px-5 py-3.5" />
                </tr>

                {data?.members.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        icon={<Users size={18} />}
                        title="No team members yet"
                        description="Invite a colleague to collaborate on your sites."
                      />
                    </td>
                  </tr>
                )}

                {data?.members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground">{member.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="relative inline-block">
                        <select value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as Exclude<TeamRole, "owner">)}
                          className="appearance-none pl-2 pr-6 py-0.5 text-xs rounded-full border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer">
                          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {member.invite_accepted ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Invited
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => handleRemove(member.id, member.email)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                        title="Remove member">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
