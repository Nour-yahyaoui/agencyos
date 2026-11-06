'use client';
import * as React from 'react';
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners, type DragEndEvent, type DragStartEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, GripVertical, MessageSquare, Link2 } from 'lucide-react';
import type { Task } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
export const COLUMNS: { id: Task['status']; label: string }[] = [{ id: 'BACKLOG', label: 'Backlog' }, { id: 'TODO', label: 'To do' }, { id: 'IN_PROGRESS', label: 'In progress' }, { id: 'REVIEW', label: 'Review' }, { id: 'DONE', label: 'Done' }];
const priorityVariant: Record<string, 'secondary' | 'outline' | 'warning' | 'destructive'> = { LOW: 'secondary', MEDIUM: 'outline', HIGH: 'warning', URGENT: 'destructive' };

function TaskCard({ task, onOpen, overlay, disabled }: { task: Task; onOpen?: (t: Task) => void; overlay?: boolean; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: disabled || overlay });
  const overdue = task.dueDate && task.status !== 'DONE' && new Date(task.dueDate) < new Date();
  const blocked = task.dependencies?.some((d) => d.prerequisite && d.prerequisite.status !== 'DONE');
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('group rounded-md border bg-card p-3 shadow-sm', isDragging && 'opacity-40', overlay && 'rotate-2 shadow-pop', !disabled && 'cursor-grab active:cursor-grabbing')}>
      <div className="flex items-start gap-2">
        {!disabled && <button className="mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 focus-ring rounded" aria-label={`Drag ${task.title}`} {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></button>}
        <button type="button" onClick={() => onOpen?.(task)} className="min-w-0 flex-1 text-left text-sm font-medium hover:text-primary focus-ring rounded">{task.title}</button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5"><Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>{task.milestone && <Badge variant="purple" className="max-w-[140px] truncate">{task.milestone.name}</Badge>}{blocked && <Badge variant="warning"><Link2 className="mr-1 h-3 w-3" />Blocked</Badge>}</div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span className={cn('flex items-center gap-1', overdue && 'text-destructive font-medium')}><Calendar className="h-3.5 w-3.5" />{formatDate(task.dueDate)}</span><div className="flex items-center gap-2">{(task._count?.comments ?? 0) > 0 && <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{task._count!.comments}</span>}{task.assignee ? <Avatar name={task.assignee.name} className="h-6 w-6 text-[10px]" /> : <span className="h-6 w-6 rounded-full border border-dashed" />}</div></div>
    </div>
  );
}
function Column({ id, label, tasks, onOpen, disabled }: { id: Task['status']; label: string; tasks: Task[]; onOpen: (t: Task) => void; disabled?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  return <div className={cn('flex w-72 shrink-0 flex-col rounded-lg bg-muted/50 p-2', isOver && 'ring-2 ring-primary/40')}><div className="flex items-center justify-between px-2 py-2"><span className="text-sm font-semibold">{label}</span><span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">{tasks.length}</span></div><SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}><div ref={setNodeRef} className="flex min-h-[120px] flex-1 flex-col gap-2 p-1">{tasks.map((t) => <TaskCard key={t.id} task={t} onOpen={onOpen} disabled={disabled} />)}{tasks.length === 0 && <div className="flex flex-1 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">Drop tasks here</div>}</div></SortableContext></div>;
}
export function KanbanBoard({ tasks, onMove, onOpen, disabled }: { tasks: Task[]; onMove: (taskId: string, status: Task['status'], position: number) => void; onOpen: (t: Task) => void; disabled?: boolean }) {
  const [active, setActive] = React.useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const byCol = (s: Task['status']) => tasks.filter((t) => t.status === s).sort((a, b) => a.position - b.position);
  const onDragStart = (e: DragStartEvent) => setActive(tasks.find((t) => t.id === e.active.id) ?? null);
  const onDragEnd = (e: DragEndEvent) => {
    setActive(null); const { active: a, over } = e; if (!over || disabled) return;
    const task = tasks.find((t) => t.id === a.id); if (!task) return;
    const overId = String(over.id); const overTask = tasks.find((t) => t.id === overId);
    const status = (COLUMNS.some((c) => c.id === overId) ? overId : overTask?.status) as Task['status'] | undefined; if (!status) return;
    const col = byCol(status).filter((t) => t.id !== task.id);
    let position = col.length;
    if (overTask && overTask.id !== task.id) { const idx = col.findIndex((t) => t.id === overTask.id); position = idx >= 0 ? idx : col.length; }
    if (task.status === status && task.position === position) return;
    onMove(task.id, status, position);
  };
  return <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}><div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">{COLUMNS.map((c) => <Column key={c.id} id={c.id} label={c.label} tasks={byCol(c.id)} onOpen={onOpen} disabled={disabled} />)}</div><DragOverlay>{active && <TaskCard task={active} overlay />}</DragOverlay></DndContext>;
}
