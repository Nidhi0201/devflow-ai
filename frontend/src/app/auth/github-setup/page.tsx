import { redirect } from "next/navigation";

export default function GitHubSetupRedirect() {
  redirect("/admin/setup");
}
