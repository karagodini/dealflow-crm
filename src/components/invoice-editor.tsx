"use client";

import { useActionState, useMemo, useState } from "react";

import { Field, FormError, SubmitButton, controlClass } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { invoiceTotals } from "@/lib/invoice-math";
import { dollarsToCents, formatMoney } from "@/lib/money";
import { createInvoice, updateInvoice } from "@/server/actions/invoices";

type Option = { id: string; label: string };
type Line = { description: string; quantity: string; unitPrice: string };

const emptyLine = (): Line => ({ description: "", quantity: "1", unitPrice: "" });

export function InvoiceEditor({
  mode,
  invoiceId,
  currency,
  clients,
  deals,
  defaults,
}: {
  mode: "create" | "edit";
  invoiceId?: string;
  currency: string;
  clients: Option[];
  deals: Option[];
  defaults: {
    clientId: string;
    dealId: string;
    issueDate: string;
    dueDate: string;
    taxRate: string;
    notes: string;
    items: Line[];
  };
}) {
  const action = mode === "create" ? createInvoice : updateInvoice.bind(null, invoiceId ?? "");
  const [state, formAction] = useActionState(action, {});
  const [items, setItems] = useState<Line[]>(
    defaults.items.length > 0 ? defaults.items : [emptyLine()],
  );
  const [taxRate, setTaxRate] = useState(defaults.taxRate);

  const totals = useMemo(() => {
    const lines = items.flatMap((item) => {
      const cents = dollarsToCents(item.unitPrice);
      const quantity = Number(item.quantity);
      if (cents === null || !Number.isFinite(quantity)) return [];
      return [{ quantity, unitPriceCents: cents }];
    });
    return invoiceTotals(lines, Number(taxRate) || 0);
  }, [items, taxRate]);

  return (
    <form action={formAction} className="grid gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Client" htmlFor="invoice-client" error={state.fieldErrors?.clientId?.[0]}>
          <select
            id="invoice-client"
            name="clientId"
            className={controlClass}
            defaultValue={defaults.clientId}
            required
          >
            <option value="">Choose a client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Deal" htmlFor="invoice-deal">
          <select
            id="invoice-deal"
            name="dealId"
            className={controlClass}
            defaultValue={defaults.dealId}
          >
            <option value="">None</option>
            {deals.map((deal) => (
              <option key={deal.id} value={deal.id}>
                {deal.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Issue date" htmlFor="invoice-issue">
          <Input
            id="invoice-issue"
            name="issueDate"
            type="date"
            defaultValue={defaults.issueDate}
            required
          />
        </Field>
        <Field label="Due date" htmlFor="invoice-due">
          <Input
            id="invoice-due"
            name="dueDate"
            type="date"
            defaultValue={defaults.dueDate}
            required
          />
        </Field>
        <Field label="Tax %" htmlFor="invoice-tax">
          <Input
            id="invoice-tax"
            name="taxRate"
            inputMode="decimal"
            value={taxRate}
            onChange={(event) => setTaxRate(event.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Line items</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => setItems((current) => [...current, emptyLine()])}
          >
            Add line
          </Button>
        </div>
        {items.map((item, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_90px_120px_auto]"
          >
            <Field label="Description" htmlFor={`line-description-${index}`}>
              <Input
                id={`line-description-${index}`}
                value={item.description}
                onChange={(event) =>
                  setItems((current) =>
                    current.map((line, lineIndex) =>
                      lineIndex === index ? { ...line, description: event.target.value } : line,
                    ),
                  )
                }
              />
            </Field>
            <Field label="Quantity" htmlFor={`line-qty-${index}`}>
              <Input
                id={`line-qty-${index}`}
                value={item.quantity}
                inputMode="decimal"
                onChange={(event) =>
                  setItems((current) =>
                    current.map((line, lineIndex) =>
                      lineIndex === index ? { ...line, quantity: event.target.value } : line,
                    ),
                  )
                }
              />
            </Field>
            <Field label="Rate" htmlFor={`line-rate-${index}`}>
              <Input
                id={`line-rate-${index}`}
                value={item.unitPrice}
                inputMode="decimal"
                onChange={(event) =>
                  setItems((current) =>
                    current.map((line, lineIndex) =>
                      lineIndex === index ? { ...line, unitPrice: event.target.value } : line,
                    ),
                  )
                }
              />
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                disabled={items.length === 1}
                onClick={() =>
                  setItems((current) => current.filter((_, lineIndex) => lineIndex !== index))
                }
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Field label="Notes" htmlFor="invoice-notes">
        <Textarea id="invoice-notes" name="notes" rows={3} defaultValue={defaults.notes} />
      </Field>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <dl className="grid gap-1 text-sm">
          <div className="flex justify-between gap-8">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(totals.subtotalCents, currency)}</dd>
          </div>
          <div className="flex justify-between gap-8">
            <dt className="text-muted-foreground">Tax</dt>
            <dd className="tabular-nums">{formatMoney(totals.taxCents, currency)}</dd>
          </div>
          <div className="flex justify-between gap-8 text-base font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(totals.totalCents, currency)}</dd>
          </div>
        </dl>
        <SubmitButton>{mode === "create" ? "Save draft" : "Save changes"}</SubmitButton>
      </div>
    </form>
  );
}
