import { chromium } from "@playwright/test"
import { mkdir } from "node:fs/promises"

const base = "http://localhost:3000"
await mkdir("docs", { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(`${base}/`)
await page.getByRole("heading", { name: /operating desk/i }).waitFor()
await page.screenshot({ path: "docs/home.png" })

await page.goto(`${base}/login`)
await page.getByLabel("Email").fill("mara@harborandpine.studio")
await page.getByLabel("Password").fill("Harborpine#2026")
await page.getByRole("button", { name: "Sign in" }).click()
await page.getByRole("heading", { name: "Dashboard" }).waitFor()
await page.screenshot({ path: "docs/dashboard.png" })

await page.getByRole("link", { name: "Pipeline" }).click()
await page.getByRole("heading", { name: "Pipeline" }).waitFor()
await page.screenshot({ path: "docs/pipeline.png" })

await page.getByRole("link", { name: "Clients" }).click()
await page.getByRole("link", { name: "Linden Bakery" }).click()
await page.getByRole("heading", { name: "Linden Bakery" }).waitFor()
await page.screenshot({ path: "docs/client.png" })

await page.getByRole("link", { name: "Invoices" }).click()
await page.getByRole("heading", { name: "Invoices" }).waitFor()
await page.screenshot({ path: "docs/invoices.png" })

await page.getByRole("link", { name: "INV-1075" }).click()
await page.getByRole("heading", { name: "INV-1075" }).waitFor()
await page.screenshot({ path: "docs/invoice.png" })

await browser.close()
console.log("Saved screenshots in docs/")
