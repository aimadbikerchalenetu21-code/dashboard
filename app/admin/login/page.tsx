import { LoginForm } from "@/components/admin/login-form";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/admin");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <span className="text-2xl">📺</span>
          </div>
          <h1 className="text-2xl font-bold text-white">IPTV Admin</h1>
          <p className="text-slate-400 mt-1">Sign in to your dashboard</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
