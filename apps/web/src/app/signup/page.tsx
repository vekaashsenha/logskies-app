import Workspace from "@/components/connected-workspace";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sign up", robots: { index: false, follow: false } };
export default function SignUpPage() { return <Workspace initialAuthMode="signup" />; }
