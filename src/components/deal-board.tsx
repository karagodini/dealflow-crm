"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import { formatMoney } from "@/lib/money";
import { moveDeal } from "@/server/actions/deals";

export type BoardDeal = {
  id: string;
  title: string;
  valueCents: number;
  clientName: string;
  ownerName: string | null;
  stageId: string;
};

export type BoardStage = {
  id: string;
  name: string;
  color: string;
  isWon: boolean;
  isLost: boolean;
};

function columnId(stageId: string) {
  return `column:${stageId}`;
}

function DealCard({ deal, currency }: { deal: BoardDeal; currency: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  });
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border border-border bg-card p-3 shadow-sm ${isDragging ? "opacity-40" : ""}`}
      {...attributes}
      {...listeners}
    >
      <Link href={`/deals/${deal.id}`} className="font-medium hover:underline">
        {deal.title}
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">{deal.clientName}</p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-medium tabular-nums">{formatMoney(deal.valueCents, currency)}</span>
        <span className="text-muted-foreground">{deal.ownerName ?? "Unassigned"}</span>
      </div>
    </article>
  );
}

function Column({
  stage,
  deals,
  currency,
}: {
  stage: BoardStage;
  deals: BoardDeal[];
  currency: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId(stage.id) });
  const total = deals.reduce((sum, deal) => sum + deal.valueCents, 0);
  return (
    <section className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/50">
      <header className="border-t-2 px-3 py-3" style={{ borderColor: stage.color }}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">{stage.name}</h2>
          <span className="text-xs text-muted-foreground">{deals.length}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {formatMoney(total, currency)}
        </p>
      </header>
      <div
        ref={setNodeRef}
        className={`flex min-h-40 flex-1 flex-col gap-2 px-2 pb-3 ${isOver ? "bg-primary/5" : ""}`}
      >
        <SortableContext
          items={deals.map((deal) => deal.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} currency={currency} />
          ))}
        </SortableContext>
      </div>
    </section>
  );
}

export function DealBoard({
  stages,
  deals,
  currency,
}: {
  stages: BoardStage[];
  deals: BoardDeal[];
  currency: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(deals);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const active = items.find((deal) => deal.id === activeId) ?? null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active: dragged, over } = event;
    if (!over) return;
    const dealId = String(dragged.id);
    const overId = String(over.id);
    const current = items.find((deal) => deal.id === dealId);
    if (!current) return;
    const stageId = overId.startsWith("column:")
      ? overId.slice("column:".length)
      : (items.find((deal) => deal.id === overId)?.stageId ?? current.stageId);
    const column = items.filter((deal) => deal.stageId === stageId && deal.id !== dealId);
    const overIndex = column.findIndex((deal) => deal.id === overId);
    const index = overIndex === -1 ? column.length : overIndex;
    const next = items.map((deal) => (deal.id === dealId ? { ...deal, stageId } : deal));
    setItems(next);
    startTransition(async () => {
      const result = await moveDeal(dealId, stageId, index);
      if (result.error) {
        setItems(deals);
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            currency={currency}
            deals={items.filter((deal) => deal.stageId === stage.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <article className="w-72 rounded-lg border border-border bg-card p-3 shadow-lg">
            <p className="font-medium">{active.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{active.clientName}</p>
          </article>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
