import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth";

export function GitHubSignIn() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo: "/dashboard" });
      }}
    >
      <Button type="submit" variant="outline" className="w-full">
        Continue with GitHub
      </Button>
    </form>
  );
}
