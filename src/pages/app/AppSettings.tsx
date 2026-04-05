import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const AppSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setFirstName(data.first_name);
          setLastName(data.last_name);
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="animate-slide-up px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-foreground">Settings</h1>

      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Profile</h2>
          <div className="flex flex-col gap-3">
            <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-12 rounded-sm bg-secondary" />
            <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-12 rounded-sm bg-secondary" />
            <Button onClick={handleSave} disabled={saving} className="h-12 rounded-sm">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>

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
