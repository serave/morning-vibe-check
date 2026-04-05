import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">We'll send you a reset link</p>
        </div>
        {sent ? (
          <div className="rounded-lg bg-card p-6 text-center">
            <p className="text-foreground">Check your email for a reset link.</p>
            <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-sm bg-card" />
            <Button type="submit" disabled={loading} className="h-12 w-full rounded-sm text-base font-semibold">
              {loading ? "Sending…" : "Send Reset Link"}
            </Button>
            <Link to="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">Back to login</Link>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
