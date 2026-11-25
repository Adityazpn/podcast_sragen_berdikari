"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Daftar yang bisa diurutkan dengan drag & drop (mouse, sentuh, dan keyboard). */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  disabled,
  children,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  disabled?: boolean;
  children: (item: T, index: number) => React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy} disabled={disabled}>
        {items.map((item, i) => children(item, i))}
      </SortableContext>
    </DndContext>
  );
}

export function SortableItem({
  id,
  children,
  className,
  disabled,
}: {
  id: string;
  children: (handle: React.ReactNode) => React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const handle = disabled ? null : (
    <button
      type="button"
      className="cursor-grab touch-none rounded p-1 text-secondary hover:bg-muted active:cursor-grabbing"
      aria-label="Seret untuk mengubah urutan"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(className, isDragging && "relative z-10 opacity-80 shadow-lg")}
    >
      {children(handle)}
    </div>
  );
}
