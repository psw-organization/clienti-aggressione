import { redirect } from "next/navigation"

export default function Page() {
  redirect("/leads?onlyNoWebsite=1&sort=updated")
}
