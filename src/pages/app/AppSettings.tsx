import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, Download, Trash2 } from "lucide-react";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

const AppSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sportType, setSportType] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [saving, setSaving] = useState(false);

  // Change password
  const [pwOpen, setPwOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, last_name, sport_type, timezone")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFirstName(data.first_name ?? "");
          setLastName(data.last_name ?? "");
          setSportType(data.sport_type ?? "");
          setTimezone(data.timezone ?? "America/New_York");
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName, sport_type: sportType, timezone })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  const handleChangePassword = async () => {
    if (newPw !== confirmPw) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated" });
      setNewPw("");
      setConfirmPw("");
      setPwOpen(false);
    }
  };

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    const { data, error } = await supabase
      .from("checkins")
      .select("entry_date, hrv_rmssd, sleep_hours, soreness, feeling, recovery_score, training_recommendation, trained_yesterday, sport, training_intensity, training_duration_min")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: true });
    setExporting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    if (!data || data.length === 0) {
      toast({ title: "No data", description: "No check-ins to export" });
      return;
    }
    const headers = ["date", "hrv_rmssd", "sleep_hours", "soreness", "feeling", "recovery_score", "training_recommendation", "trained_yesterday", "sport", "intensity", "duration"];
    const rows = data.map((r) => [
      r.entry_date, r.hrv_rmssd ?? "", r.sleep_hours ?? "", r.soreness ?? "", r.feeling ?? "",
      r.recovery_score ?? "", r.training_recommendation ?? "", r.trained_yesterday ?? "",
      r.sport ?? "", r.training_intensity ?? "", r.training_duration_min ?? "",
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "checkins_export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export complete" });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE" || !user) return;
    setDeleting(true);
    await supabase.from("checkins").delete().eq("user_id", user.id);
    await supabase.from("baseline_cache").delete().eq("user_id", user.id);
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.auth.signOut();
    setDeleting(false);
    navigate("/login");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="animate-slide-up px-4 py-6 pb-24">
      <h1 className="mb-6 text-xl font-bold text-foreground">Settings</h1>

      <div className="flex flex-col gap-4">
        {/* Profile */}
        <div className="rounded-lg bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Profile</h2>
          <div className="flex flex-col gap-3">
            <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-12 rounded-sm bg-secondary" />
            <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-12 rounded-sm bg-secondary" />
            <Input placeholder="e.g. Cycling, Running" value={sportType} onChange={(e) => setSportType(e.target.value)} className="h-12 rounded-sm bg-secondary" />
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="flex h-12 w-full rounded-sm border border-input bg-secondary px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <Button onClick={handleSave} disabled={saving} className="h-12 rounded-sm">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Change Password */}
        <div className="rounded-lg bg-card p-4">
          <button
            onClick={() => setPwOpen(!pwOpen)}
            className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
          >
            Change Password
            {pwOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {pwOpen && (
            <div className="mt-3 flex flex-col gap-3">
              <Input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="h-12 rounded-sm bg-secondary" />
              <Input type="password" placeholder="Confirm password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="h-12 rounded-sm bg-secondary" />
              <Button onClick={handleChangePassword} disabled={pwSaving} className="h-12 rounded-sm">
                {pwSaving ? "Updating…" : "Update Password"}
              </Button>
            </div>
          )}
        </div>

        {/* Data Export */}
        <div className="rounded-lg bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Data</h2>
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="h-12 w-full rounded-sm">
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exporting…" : "Export My Data"}
          </Button>
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-destructive bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-destructive">Danger Zone</h2>
          {!showDelete ? (
            <Button variant="outline" onClick={() => setShowDelete(true)} className="h-12 w-full rounded-sm border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">Type <span className="font-bold text-destructive">DELETE</span> to confirm account deletion. This will remove all your data.</p>
              <Input placeholder='Type "DELETE"' value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="h-12 rounded-sm bg-secondary" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowDelete(false); setDeleteConfirm(""); }} className="h-12 flex-1 rounded-sm">Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirm !== "DELETE" || deleting} className="h-12 flex-1 rounded-sm">
                  {deleting ? "Deleting…" : "Confirm Delete"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Account / Sign Out */}
        <div className="rounded-lg bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Account</h2>
          <p className="mb-3 text-xs text-muted-foreground">{user?.email}</p>
          <Button variant="outline" onClick={handleSignOut} className="h-12 w-full rounded-sm border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
