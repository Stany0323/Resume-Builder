import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { FileText, Lock, Mail } from "lucide-react";
import { isSupabaseConfigured, supabase } from "./supabase";

type AuthGateProps = {
  children: (session: Session, signOut: () => Promise<void>) => ReactNode;
};

type AuthMode = "signin" | "signup";

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsCheckingSession(false);
      return;
    }

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      setSession(data.session);
      setIsCheckingSession(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsCheckingSession(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (isCheckingSession) {
    return <p className="boot">Loading…</p>;
  }

  if (session && supabase) {
    const client = supabase;
    return <>{children(session, () => client.auth.signOut().then(() => undefined))}</>;
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      return;
    }

    setStatus("loading");
    setMessage(null);

    const credentials = {
      email: email.trim(),
      password,
    };
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    setStatus("idle");

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("Check your email to confirm your account, then sign in.");
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-label="Resume Builder sign in">
        <div className="auth-brand">
          <span className="auth-brand-icon" aria-hidden="true">
            <FileText size={24} strokeWidth={1.8} />
          </span>
          <div>
            <h1>Resume Builder</h1>
            <p>Sign in to save resumes across devices.</p>
          </div>
        </div>

        {!isSupabaseConfigured ? (
          <p className="auth-message" role="alert">
            Supabase is not configured. Add the frontend environment variables and restart the app.
          </p>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label>
              Email
              <span className="auth-input-shell">
                <Mail aria-hidden="true" size={17} strokeWidth={2} />
                <input
                  autoComplete="email"
                  inputMode="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label>
              Password
              <span className="auth-input-shell">
                <Lock aria-hidden="true" size={17} strokeWidth={2} />
                <input
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  required
                  type="password"
                  value={password}
                />
              </span>
            </label>

            {message ? (
              <p className="auth-message" role="alert">
                {message}
              </p>
            ) : null}

            <button className="auth-primary" disabled={status === "loading"} type="submit">
              {status === "loading" ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        )}

        <button
          className="auth-switch"
          onClick={() => {
            setMode((current) => (current === "signin" ? "signup" : "signin"));
            setMessage(null);
          }}
          type="button"
        >
          {mode === "signin" ? "Create an account" : "I already have an account"}
        </button>
      </section>
    </main>
  );
}
