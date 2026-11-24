import { auth, signOut } from "@/auth";

export default async function DashboardPlaceholder({
  title,
}: {
  title: string;
}) {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="text-slate-600">
        Signed in as {session?.user.name} ({session?.user.role})
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}