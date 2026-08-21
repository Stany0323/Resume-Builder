import { useEffect, useRef, useState } from "react";

/**
 * Shared add / remove / undo machinery for every repeating section.
 * Extracted from panels.tsx so Experience and Education get the same
 * behaviour without a second implementation.
 */

export function reorder<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, order: index }));
}

export function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

/* ------------------------------------------------------------ useItemList */

export type ItemList<T> = {
  add: (item: T) => void;
  items: T[];
  remove: (id: string) => void;
  removal: RemovalUndo<T>;
  update: (id: string, patch: Partial<T>) => void;
};

/**
 * Controlled list helper. Keeps `order` contiguous on every mutation and
 * routes removals through the undo window.
 */
export function useItemList<T extends { id: string; order: number }>(
  items: T[],
  onChange: (items: T[]) => void,
): ItemList<T> {
  const removal = useRemovalUndo<T>((restored, index) => {
    const next = [...items];
    next.splice(index, 0, restored);
    onChange(reorder(next));
  });

  return {
    items,
    removal,
    add: (item) => onChange(reorder([...items, item])),
    update: (id, patch) => onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item))),
    remove: (id) => {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) {
        return;
      }
      removal.remove(items[index], index);
      onChange(reorder(items.filter((item) => item.id !== id)));
    },
  };
}

/* --------------------------------------------------------- removal + undo */

/* Removal is the one action that needs undo (PIVOT-v3 §6). Remove immediately,
   offer undo briefly — an undo affordance beats a confirmation modal. */

export type RemovalUndo<T> = {
  pending: { index: number; item: T } | null;
  remove: (item: T, index: number) => void;
  undo: () => void;
};

const UNDO_WINDOW_MS = 8000;

export function useRemovalUndo<T>(restore: (item: T, index: number) => void): RemovalUndo<T> {
  const [pending, setPending] = useState<{ index: number; item: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  return {
    pending,
    remove: (item, index) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      setPending({ index, item });
      timer.current = setTimeout(() => setPending(null), UNDO_WINDOW_MS);
    },
    undo: () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      if (pending) {
        restore(pending.item, pending.index);
      }
      setPending(null);
    },
  };
}

/* ------------------------------------------------------------------- view */

export function AddButton({
  disabled = false,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="add-button" disabled={disabled} onClick={onClick} type="button">
      + {label}
    </button>
  );
}

export function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button aria-label={label} className="remove-button" onClick={onRemove} type="button">
      Remove
    </button>
  );
}

export function UndoRow<T>({ removal, what }: { removal: RemovalUndo<T>; what: string }) {
  if (!removal.pending) {
    return null;
  }

  return (
    <div className="undo-row" role="status">
      <span>{what} removed.</span>
      <button onClick={removal.undo} type="button">
        Undo
      </button>
    </div>
  );
}

export function EmptyState({
  actionLabel,
  onAction,
  text,
}: {
  actionLabel: string;
  onAction: () => void;
  text: string;
}) {
  return (
    <div className="empty-state">
      <p>{text}</p>
      <AddButton label={actionLabel} onClick={onAction} />
    </div>
  );
}
