import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Heart, Moon, Activity, RefreshCw, Smartphone, Unplug, Settings, Square, CheckSquare } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getHealthPlatform,
  isHealthAvailable,
  requestHealthPermissions,
  syncHealthData,
  disconnectHealth,
  getConnection,
  getTodayHealth,
  type TodayHealth,
} from "@/lib/health";
import { formatDistanceToNow } from "date-fns";

const ConnectHealth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const platform = getHealthPlatform();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [connection, setConnection] = useState<any>(null);
  const [today, setToday] = useState<TodayHealth | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [revokedSteps, setRevokedSteps] = useState<Record<string, boolean>>({});
  const [showRevokeChecklist, setShowRevokeChecklist] = useState(false);

  const REVOKE_STEPS = [
    { id: "hrv", label: "Heart Rate Variability", icon: Heart },
    { id: "sleep", label: "Sleep Analysis", icon: Moon },
    { id: "rhr", label: "Resting Heart Rate", icon: Activity },
  ];
  const toggleStep = (id: string) =>
    setRevokedSteps((s) => ({ ...s, [id]: !s[id] }));

  const refresh = async () => {
    if (!user) return;
    const [conn, t] = await Promise.all([getConnection(user.id), getTodayHealth(user.id)]);
    setConnection(conn);
    setToday(t);
  };

  useEffect(() => {
    isHealthAvailable().then(setAvailable);
    refresh();
  }, [user]);

  const handleConnect = async () => {
    if (!user) return;
    setSyncing(true);
    const ok = await requestHealthPermissions();
    if (!ok) {
      setSyncing(false);
      toast({ title: "Permission denied", description: "Health access was not granted.", variant: "destructive" });
      return;
    }
    try {
      const samples = await syncHealthData(user.id, 14);
      toast({ title: "Connected", description: `Synced ${samples.length} health records.` });
      await refresh();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const samples = await syncHealthData(user.id, 7);
      toast({ title: "Synced", description: `${samples.length} records updated.` });
      await refresh();
    } catch (e: any) {
      toast({ title: "Sync failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      await disconnectHealth(user.id);
      toast({ title: "Disconnected", description: "Health access revoked and synced data cleared." });
      setConnection(null);
      setToday(null);
      setRevokedSteps({});
      setShowRevokeChecklist(platform === "HEALTHKIT");
    } catch (e: any) {
      toast({ title: "Disconnect failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const platformLabel =
    platform === "HEALTHKIT" ? "Apple Health" : platform === "HEALTH_CONNECT" ? "Health Connect" : "Health";

  return (
    <div className="animate-slide-up px-4 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-xl font-bold text-foreground">Connect {platformLabel}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Auto-import HRV, sleep, and resting heart rate so check-ins fill in for you.
      </p>

      {!platform && (
        <div className="mt-6 rounded-lg bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-foreground">
            <Smartphone className="h-5 w-5" />
            <span className="font-semibold">Native app required</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Health data sync only works inside the iOS or Android build. In the browser, you'll continue entering values manually.
          </p>
        </div>
      )}

      {platform === "HEALTH_CONNECT" && (
        <div className="mt-6 rounded-lg bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Health Connect support is on the roadmap. For now, please enter values manually on Android.
          </p>
        </div>
      )}

      {platform === "HEALTHKIT" && available === false && (
        <div className="mt-6 rounded-lg bg-card p-4">
          <p className="text-sm text-muted-foreground">
            HealthKit isn't available on this device.
          </p>
        </div>
      )}

      {platform === "HEALTHKIT" && available && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">What we read</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> HRV (RMSSD)</li>
              <li className="flex items-center gap-2"><Moon className="h-4 w-4 text-primary" /> Sleep duration</li>
              <li className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Resting heart rate</li>
            </ul>
          </div>

          {connection ? (
            <div className="rounded-lg bg-card p-4">
              <p className="text-sm text-foreground">
                ✅ Connected
                {connection.last_synced_at && (
                  <span className="ml-1 text-muted-foreground">
                    · synced {formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true })}
                  </span>
                )}
              </p>
              {today && (
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">HRV</p>
                    <p className="text-lg font-bold text-foreground">{today.hrv_rmssd != null ? `${today.hrv_rmssd}` : "–"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sleep</p>
                    <p className="text-lg font-bold text-foreground">{today.sleep_hours != null ? `${today.sleep_hours}h` : "–"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">RHR</p>
                    <p className="text-lg font-bold text-foreground">{today.resting_hr != null ? `${today.resting_hr}` : "–"}</p>
                  </div>
                </div>
              )}
              <Button
                onClick={handleSync}
                disabled={syncing}
                variant="secondary"
                className="mt-4 w-full"
              >
                <RefreshCw className={syncing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                {syncing ? "Syncing…" : "Sync Now"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" disabled={syncing} className="mt-2 w-full text-destructive hover:text-destructive">
                    <Unplug className="mr-2 h-4 w-4" />
                    Disconnect Health
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect {platformLabel}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This revokes access and deletes all synced health samples and connection info for your account. You'll need to reconnect to resume auto-fill. Permissions granted in iOS Settings must be revoked there as well.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect}>Disconnect</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <Button onClick={handleConnect} disabled={syncing} className="h-14 w-full text-base font-semibold">
              {syncing ? "Connecting…" : "Connect Apple Health"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectHealth;
