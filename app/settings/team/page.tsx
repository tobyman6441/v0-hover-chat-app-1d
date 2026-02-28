import { redirect } from "next/navigation"

export default function TeamSettingsPage() {
  // Redirect to main settings page which has team management
  redirect("/settings")
}
