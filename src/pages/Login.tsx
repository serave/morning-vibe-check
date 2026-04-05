import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/app");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Morning Check-In</h1>
          <p className="mt-2 text-sm text-muted-foreground">Track your recovery, every day</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-sm bg-card"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12 rounded-sm bg-card"
          />
          <Button type="submit" disabled={loading} className="h-12 w-full rounded-sm text-base font-semibold">
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
        <div className="mt-6 flex flex-col items-center gap-3 text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
          <span className="text-muted-foreground">
            No account?{" "}
            <Link to="/register" className="text-primary hover:underline">Sign up</Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
