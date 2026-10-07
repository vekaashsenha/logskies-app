"use client";
import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";
import { authClient } from "@/lib/auth-client";
export function useAccountSession() {
  const [signedIn, setSignedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    if (!authClient) {
      Promise.resolve().then(() => {
        if (active) setLoaded(true);
      });
      return () => {
        active = false;
      };
    }
    let changed = false;
    const {
      data: { subscription },
    } = authClient.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (active) {
        setSignedIn(!!session);
        setLoaded(true);
      }
    });
    void authClient.auth.getSession().then(({ data }) => {
      if (active && !changed) {
        setSignedIn(!!data.session);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return { signedIn, loaded };
}
export default function AccountLink(props: ComponentProps<typeof Link>) {
  const { signedIn } = useAccountSession();
  const accountHref = props.href === "/signup" || props.href === "/signin";
  const label =
    typeof props.children === "string" &&
    /sign up|sign in/i.test(props.children)
      ? "My fleet →"
      : props.children;
  return (
    <Link {...props} href={signedIn && accountHref ? "/workspace" : props.href}>
      {signedIn && accountHref ? label : props.children}
    </Link>
  );
}
