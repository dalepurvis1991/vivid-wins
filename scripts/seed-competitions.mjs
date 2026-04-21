#!/usr/bin/env node
// Seed four live competitions + their instant-win pools into Supabase.
// Ratios per COMPETITION-STRUCTURE.md:
//   17.5% site credit · 5% booster packs · 5% bonus tickets · 1 main winner.
//
// Usage (from vivid-wins-nextjs/):
//   node scripts/seed-competitions.mjs
//
// Env vars required:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Re-runs: deletes any existing rows for these slugs first, so it's idempotent.

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// --- Load .env.local manually (no dotenv dep) ------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')
try {
  const envRaw = readFileSync(envPath, 'utf8')
  for (const line of envRaw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
} catch (err) {
  console.error('Could not read .env.local at', envPath)
  throw err
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// --- PostgREST helper -------------------------------------------------------
async function pg(path, { method = 'GET', body, prefer } = {}) {
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  }
  if (prefer) headers.Prefer = prefer
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`${method} ${path} → ${res.status} ${txt}`)
  }
  // 204 for DELETE, or JSON body
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// --- Weighted sampling ------------------------------------------------------
function pickWeighted(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

// Reference credit distribution per spec (10p steps up to £1).
// Idiosyncratic weights — inverse-ish but not a clean formula.
// Used as the template; extended with long thin tail for wider ranges.
const BASE_CREDIT_WEIGHTS = [44, 8, 14, 12, 4, 8, 4, 2, 2, 2]

function buildCreditDistribution(minPence, maxPence, stepPence = 10) {
  const steps = []
  const weights = []
  for (let v = minPence; v <= maxPence; v += stepPence) {
    steps.push(v)
    const idx = (v - minPence) / stepPence
    // Use BASE_CREDIT_WEIGHTS[idx] if available; otherwise long thin tail
    const w = idx < BASE_CREDIT_WEIGHTS.length ? BASE_CREDIT_WEIGHTS[idx] : 1
    weights.push(w)
  }
  return { steps, weights }
}

// --- 18-pack pool (ordered cheap → rare) -----------------------------------
const PACK_POOL = [
  { sku: 'journey-together',    label: 'Journey Together',      value: 500,   weight: 10.0 },
  { sku: 'destined-rivals',     label: 'Destined Rivals',       value: 500,   weight: 10.0 },
  { sku: 'surging-sparks',      label: 'Surging Sparks',        value: 500,   weight: 10.0 },
  { sku: 'temporal-forces',     label: 'Temporal Forces',       value: 500,   weight: 10.0 },
  { sku: 'obsidian-flames',     label: 'Obsidian Flames',       value: 500,   weight: 10.0 },
  { sku: 'paldean-fates',       label: 'Paldean Fates',         value: 500,   weight: 10.0 },
  { sku: 'twilight-masquerade', label: 'Twilight Masquerade',   value: 500,   weight: 10.0 },
  { sku: 'stellar-crown',       label: 'Stellar Crown',         value: 500,   weight: 10.0 },
  { sku: 'paradox-rift',        label: 'Paradox Rift',          value: 500,   weight: 10.0 },
  { sku: 'lost-origin',         label: 'Lost Origin',           value: 500,   weight: 10.0 },
  { sku: 'shrouded-fable',      label: 'Shrouded Fable',        value: 600,   weight: 8.0  },
  { sku: 'ascended-heroes',     label: 'Ascended Heroes',       value: 700,   weight: 7.0  },
  { sku: 'crown-zenith',        label: 'Crown Zenith',          value: 800,   weight: 6.0  },
  { sku: 'sv-151',              label: 'Scarlet & Violet 151',  value: 1000,  weight: 5.0  },
  { sku: 'prismatic-evolutions',label: 'Prismatic Evolutions',  value: 2000,  weight: 2.0  },
  { sku: 'xy-era',              label: 'X&Y-era',               value: 2000,  weight: 2.0  },
  { sku: 'evolving-skies',      label: 'Evolving Skies',        value: 3000,  weight: 1.0  },
  { sku: 'wotc-vintage',        label: 'WOTC Vintage',          value: 12000, weight: 0.2  },
]
const PACK_WEIGHTS = PACK_POOL.map(p => p.weight)

// --- Ticket picker (without replacement) ----------------------------------
function pickUniqueTickets(total, count) {
  const pool = new Set()
  while (pool.size < count) {
    pool.add(1 + Math.floor(Math.random() * total))
  }
  return [...pool]
}

// --- Competition definitions -----------------------------------------------
const COMPS = [
  {
    slug: 'ascended-heroes-etb',
    title: 'Ascended Heroes Elite Trainer Box',
    description: 'Pokémon Center Exclusive Ascended Heroes ETB. Main prize shipped next-day once the draw concludes live on Whatnot.',
    image_url: '/images/comp-ascended-heroes.jpg',
    ticket_price_pennies: 150,
    total_tickets: 500,
    main_prize_label: 'Ascended Heroes ETB (Pokémon Center)',
    main_prize_value_pennies: 10000, // £100
    credit_range: [10, 100],         // 10p – £1
  },
  {
    slug: 'crown-zenith-etb',
    title: 'Crown Zenith Elite Trainer Box',
    description: 'Crown Zenith ETB with the iconic Galarian Gallery pull rates. Live draw on Whatnot.',
    image_url: '/images/comp-crown-zenith.jpg',
    ticket_price_pennies: 200,
    total_tickets: 600,
    main_prize_label: 'Crown Zenith ETB',
    main_prize_value_pennies: 15000, // £150
    credit_range: [10, 130],         // 10p – £1.30
  },
  {
    slug: 'charizard-upc',
    title: 'Charizard Ultra Premium Collection',
    description: 'Sealed Charizard UPC — full art promos, jumbo card, three packs. Live draw on Whatnot.',
    image_url: '/images/comp-charizard-upc.jpg',
    ticket_price_pennies: 250,
    total_tickets: 800,
    main_prize_label: 'Charizard UPC (Sealed)',
    main_prize_value_pennies: 25000, // £250
    credit_range: [10, 150],         // 10p – £1.50
  },
  {
    slug: 'temporal-forces-etb',
    title: 'Temporal Forces Elite Trainer Box',
    description: 'Entry-tier ETB comp — low ticket price, same instant-win odds. Live draw on Whatnot.',
    image_url: '/images/comp-temporal-forces.jpg',
    ticket_price_pennies: 125,
    total_tickets: 400,
    main_prize_label: 'Temporal Forces ETB',
    main_prize_value_pennies: 8000, // £80
    credit_range: [10, 80],         // 10p – 80p
  },
]

// --- Main seed run ---------------------------------------------------------
async function seedOne(comp) {
  console.log(`\n──── ${comp.slug} ────`)

  // 0. Clear any existing copy (cascade deletes instant wins)
  const existing = await pg(`/competitions?slug=eq.${comp.slug}&select=id`)
  if (existing?.length) {
    const id = existing[0].id
    console.log(`  Deleting existing competition ${id}`)
    await pg(`/competitions?id=eq.${id}`, { method: 'DELETE' })
  }

  // 1. Insert the competition row
  const creditWinners = Math.floor(comp.total_tickets * 0.175)
  const packWinners = Math.floor(comp.total_tickets * 0.05)
  const bonusWinners = Math.floor(comp.total_tickets * 0.05)
  const gross = (comp.total_tickets * comp.ticket_price_pennies) / 100
  const mainPrize = comp.main_prize_value_pennies / 100

  // Draw date — 14 days from now
  const draw_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const [row] = await pg('/competitions', {
    method: 'POST',
    prefer: 'return=representation',
    body: [{
      slug: comp.slug,
      title: comp.title,
      description: comp.description,
      image_url: comp.image_url,
      ticket_price_pennies: comp.ticket_price_pennies,
      total_tickets: comp.total_tickets,
      main_prize_label: comp.main_prize_label,
      main_prize_value_pennies: comp.main_prize_value_pennies,
      draw_at,
      live_on_url: 'https://whatnot.com/jmiread',
      status: 'live',
    }],
  })
  console.log(`  ✓ Competition ${row.id}`)
  console.log(`    price £${(comp.ticket_price_pennies/100).toFixed(2)} · ${comp.total_tickets} tix · gross £${gross.toFixed(2)} · prize £${mainPrize}`)
  console.log(`    credit winners: ${creditWinners} · pack winners: ${packWinners} · bonus winners: ${bonusWinners}`)

  // 2. Pre-compute winning tickets — no overlap between tiers
  const totalWinners = creditWinners + packWinners + bonusWinners
  const winningTickets = pickUniqueTickets(comp.total_tickets, totalWinners)

  // Shuffle so credit/pack/bonus slots get a random mix
  for (let i = winningTickets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[winningTickets[i], winningTickets[j]] = [winningTickets[j], winningTickets[i]]
  }

  const creditTickets = winningTickets.slice(0, creditWinners)
  const packTickets = winningTickets.slice(creditWinners, creditWinners + packWinners)
  const bonusTickets = winningTickets.slice(creditWinners + packWinners)

  // 3. Build instant-win rows
  const dist = buildCreditDistribution(comp.credit_range[0], comp.credit_range[1])
  const rows = []

  for (const t of creditTickets) {
    const amount = pickWeighted(dist.steps, dist.weights)
    rows.push({
      competition_id: row.id,
      ticket_number: t,
      prize_type: 'site_credit',
      prize_value_pennies: amount,
      pack_sku: null,
      pack_label: null,
    })
  }

  let packPayout = 0
  for (const t of packTickets) {
    const pack = pickWeighted(PACK_POOL, PACK_WEIGHTS)
    packPayout += pack.value
    rows.push({
      competition_id: row.id,
      ticket_number: t,
      prize_type: 'booster_pack',
      prize_value_pennies: pack.value,
      pack_sku: pack.sku,
      pack_label: pack.label,
    })
  }

  // Bonus tickets — zero-cost "+1 free ticket" reveal. prize_value_pennies
  // is 0 because we don't pay anything out; the reward is another entry
  // in the same draw (awarded by the recursive buy_ticket() RPC at runtime).
  for (const t of bonusTickets) {
    rows.push({
      competition_id: row.id,
      ticket_number: t,
      prize_type: 'bonus_ticket',
      prize_value_pennies: 0,
      pack_sku: null,
      pack_label: null,
    })
  }

  // 4. Bulk insert instant wins in batches of 500 (PostgREST default max)
  for (let i = 0; i < rows.length; i += 500) {
    await pg('/competition_instant_wins', {
      method: 'POST',
      body: rows.slice(i, i + 500),
    })
  }
  const creditPayout = rows
    .filter(r => r.prize_type === 'site_credit')
    .reduce((s, r) => s + r.prize_value_pennies, 0)
  console.log(`  ✓ Instant wins seeded: ${rows.length} rows`)
  console.log(`    credit payout: £${(creditPayout/100).toFixed(2)} · pack payout (retail): £${(packPayout/100).toFixed(2)}`)
  console.log(`    net margin est: £${(gross - mainPrize - creditPayout/100 - packPayout/100 - gross*0.015 - comp.total_tickets*0.002).toFixed(2)}`)
}

;(async () => {
  for (const comp of COMPS) {
    await seedOne(comp)
  }
  console.log('\nAll four competitions seeded and live.')
})().catch(err => {
  console.error('\nSeed failed:', err.message)
  process.exit(1)
})
