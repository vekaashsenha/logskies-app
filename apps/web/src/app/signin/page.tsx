import Workspace from "@/components/connected-workspace";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export default function SignInPage() { return <Workspace />; }
