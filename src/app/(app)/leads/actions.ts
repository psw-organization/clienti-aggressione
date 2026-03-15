"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { leadStatusSchema, leadUpsertSchema } from "@/lib/leads/lead-schemas"
import { slugify, withSuffix } from "@/lib/slug"
import {
  normalizeAddress,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "@/lib/leads/normalize"
import { supabaseAdmin } from "@/lib/supabase/admin"

function cleanOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed
}

async function uniqueSlug(base: string) {
  let slug = base
  for (let i = 0; i < 4; i += 1) {
    const { data: exists } = await supabaseAdmin
      .from("Lead")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()
    if (!exists) return slug
    slug = withSuffix(base)
  }
  return withSuffix(base)
}

export async function createLeadAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  const parsed = leadUpsertSchema.safeParse(raw)
  if (!parsed.success) {
    revalidatePath("/leads")
    return
  }

  const base = slugify(parsed.data.businessName)
  const slug = await uniqueSlug(base)

  const { data: lead, error } = await supabaseAdmin
    .from("Lead")
    .insert({
      businessName: parsed.data.businessName.trim(),
      slug,
      provider: "manual",
      category: cleanOptional(parsed.data.category) || null,
      address: cleanOptional(parsed.data.address) || null,
      city: cleanOptional(parsed.data.city) || null,
      province: cleanOptional(parsed.data.province) || null,
      region: cleanOptional(parsed.data.region) || null,
      phone: cleanOptional(parsed.data.phone) || null,
      email: cleanOptional(parsed.data.email)?.toLowerCase() || null,
      normalizedName: normalizeName(parsed.data.businessName),
      normalizedAddress: normalizeAddress(parsed.data.address),
      normalizedPhone: normalizePhone(parsed.data.phone),
      normalizedEmail: normalizeEmail(parsed.data.email),
      rating: typeof parsed.data.rating === "number" ? parsed.data.rating : null,
      reviewsCount: typeof parsed.data.reviewsCount === "number" ? parsed.data.reviewsCount : null,
      internalNotes: cleanOptional(parsed.data.internalNotes) || null,
      status: parsed.data.status ?? "new",
    })
    .select("id")
    .single()

  if (error || !lead) {
    throw new Error(error?.message || "Errore creazione lead")
  }

  revalidatePath("/leads")
  redirect(`/leads/${(lead as { id: string }).id}`)
}

export async function updateLeadStatusAction(leadId: string, formData: FormData) {
  const status = leadStatusSchema.safeParse(formData.get("status"))
  if (!status.success) {
    revalidatePath("/leads")
    return
  }

  const { error } = await supabaseAdmin.from("Lead").update({ status: status.data }).eq("id", leadId)
  if (error) {
    throw new Error(error.message)
  }
  revalidatePath("/leads")
}

export async function deleteLeadAction(leadId: string) {
  const { error } = await supabaseAdmin.from("Lead").delete().eq("id", leadId)
  if (error) {
    throw new Error(error.message)
  }
  revalidatePath("/leads")
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  const parsed = leadUpsertSchema.safeParse(raw)
  if (!parsed.success) {
    revalidatePath(`/leads/${leadId}`)
    return
  }

  const { error } = await supabaseAdmin
    .from("Lead")
    .update({
      businessName: parsed.data.businessName.trim(),
      category: cleanOptional(parsed.data.category) || null,
      address: cleanOptional(parsed.data.address) || null,
      city: cleanOptional(parsed.data.city) || null,
      province: cleanOptional(parsed.data.province) || null,
      region: cleanOptional(parsed.data.region) || null,
      phone: cleanOptional(parsed.data.phone) || null,
      email: cleanOptional(parsed.data.email)?.toLowerCase() || null,
      normalizedName: normalizeName(parsed.data.businessName),
      normalizedAddress: normalizeAddress(parsed.data.address),
      normalizedPhone: normalizePhone(parsed.data.phone),
      normalizedEmail: normalizeEmail(parsed.data.email),
      rating: typeof parsed.data.rating === "number" ? parsed.data.rating : null,
      reviewsCount: typeof parsed.data.reviewsCount === "number" ? parsed.data.reviewsCount : null,
      internalNotes: cleanOptional(parsed.data.internalNotes) || null,
      status: parsed.data.status,
    })
    .eq("id", leadId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/leads/${leadId}`)
}
