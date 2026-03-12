"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { prisma } from "@/lib/db"
import { leadStatusSchema, leadUpsertSchema } from "@/lib/leads/lead-schemas"
import { slugify, withSuffix } from "@/lib/slug"
import {
  normalizeAddress,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "@/lib/leads/normalize"

function cleanOptional(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed
}

async function uniqueSlug(base: string) {
  let slug = base
  for (let i = 0; i < 4; i += 1) {
    const exists = await prisma.lead.findUnique({ where: { slug }, select: { id: true } })
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

  const lead = await prisma.lead.create({
    data: {
      businessName: parsed.data.businessName.trim(),
      slug,
      provider: "manual",
      category: cleanOptional(parsed.data.category),
      address: cleanOptional(parsed.data.address),
      city: cleanOptional(parsed.data.city),
      province: cleanOptional(parsed.data.province),
      region: cleanOptional(parsed.data.region),
      phone: cleanOptional(parsed.data.phone),
      email: cleanOptional(parsed.data.email)?.toLowerCase(),
      normalizedName: normalizeName(parsed.data.businessName),
      normalizedAddress: normalizeAddress(parsed.data.address),
      normalizedPhone: normalizePhone(parsed.data.phone),
      normalizedEmail: normalizeEmail(parsed.data.email),
      rating: typeof parsed.data.rating === "number" ? parsed.data.rating : undefined,
      reviewsCount:
        typeof parsed.data.reviewsCount === "number" ? parsed.data.reviewsCount : undefined,
      internalNotes: cleanOptional(parsed.data.internalNotes),
      status: parsed.data.status ?? "new",
    },
  })

  revalidatePath("/leads")
  redirect(`/leads/${lead.id}`)
}

export async function updateLeadStatusAction(leadId: string, formData: FormData) {
  const status = leadStatusSchema.safeParse(formData.get("status"))
  if (!status.success) {
    revalidatePath("/leads")
    return
  }

  await prisma.lead.update({ where: { id: leadId }, data: { status: status.data } })
  revalidatePath("/leads")
}

export async function deleteLeadAction(leadId: string) {
  await prisma.lead.delete({ where: { id: leadId } })
  revalidatePath("/leads")
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  const parsed = leadUpsertSchema.safeParse(raw)
  if (!parsed.success) {
    revalidatePath(`/leads/${leadId}`)
    return
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      businessName: parsed.data.businessName.trim(),
      category: cleanOptional(parsed.data.category),
      address: cleanOptional(parsed.data.address),
      city: cleanOptional(parsed.data.city),
      province: cleanOptional(parsed.data.province),
      region: cleanOptional(parsed.data.region),
      phone: cleanOptional(parsed.data.phone),
      email: cleanOptional(parsed.data.email)?.toLowerCase(),
      normalizedName: normalizeName(parsed.data.businessName),
      normalizedAddress: normalizeAddress(parsed.data.address),
      normalizedPhone: normalizePhone(parsed.data.phone),
      normalizedEmail: normalizeEmail(parsed.data.email),
      rating: typeof parsed.data.rating === "number" ? parsed.data.rating : null,
      reviewsCount: typeof parsed.data.reviewsCount === "number" ? parsed.data.reviewsCount : null,
      internalNotes: cleanOptional(parsed.data.internalNotes),
      status: parsed.data.status,
    },
  })

  revalidatePath(`/leads/${leadId}`)
}
