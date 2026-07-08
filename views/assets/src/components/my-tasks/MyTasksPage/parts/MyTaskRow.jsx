import { __ } from '@wordpress/i18n';
import React, { useState } from "react";
import { Badge } from "@components/ui/badge";
import { UserAvatar } from '@components/common/UserAvatar';
import TaskLabelBadges from "@components/tasks/TaskLabelBadges";
import TaskStatusCircle from "@components/common/TaskStatusCircle";
import { isPrivate } from "@lib/pm-utils";
import { cn } from "@lib/utils";
import { MessageSquare, Lock, Layers, Calendar } from "lucide-react";
import {
  isTaskComplete,
  formatPmDate,
  isOverdue,
} from "@lib/pm-utils";

// Shared column grid — header (MyTasksPage) + rows must match.
// Task | Type | Labels | Project | Assignee | Due
export const MYTASK_GRID =
  "grid-cols-[minmax(200px,2.2fr)_84px_minmax(90px,1fr)_minmax(110px,1.1fr)_100px_minmax(120px,1.1fr)]";

export default function MyTaskRow({ task, projectTitle, onToggle, onOpen }) {
  const complete = isTaskComplete(task.status);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    await onToggle(task);
    setToggling(false);
  };

  const assignees = Array.isArray(task.assignees)
    ? task.assignees
    : task.assignees?.data ?? [];

  const overdue = isOverdue(task.due_date, task.status);
  const project = projectTitle || task.project?.data?.title || "";

  return (
    <div className={cn("grid items-center gap-2 px-4 py-2.5 border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors group", MYTASK_GRID)}>
      {/* Task */}
      <div className="flex items-center gap-2 min-w-0">
        <button type="button" onClick={handleToggle} disabled={toggling} className="shrink-0">
          <TaskStatusCircle complete={complete} />
        </button>
        <button
          type="button"
          className={cn(
            "min-w-0 text-left text-sm truncate hover:text-pm-accent transition-colors",
            complete ? "line-through text-pm-text-muted" : "text-pm-text-primary",
          )}
          onClick={() => onOpen && onOpen(task)}
          title={task.title}
        >
          {task.title}
        </button>
        {(task.meta?.total_sub_task ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-[11px] text-pm-text-muted shrink-0">
            <Layers className="h-3.5 w-3.5" />{task.meta.total_sub_task}
          </span>
        )}
        {(task.meta?.total_comment ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-[11px] text-pm-text-muted shrink-0">
            <MessageSquare className="h-3.5 w-3.5" />{task.meta.total_comment}
          </span>
        )}
        {isPrivate(task.meta?.privacy) && (
          <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        )}
      </div>

      {/* Type */}
      <div className="min-w-0">
        {task.type?.title ? (
          <Badge variant="outline" className="max-w-full truncate text-[11px] px-1.5 py-0.5 h-auto font-normal text-muted-foreground">
            {task.type.title}
          </Badge>
        ) : (
          <span className="text-[13px] text-pm-text-muted">—</span>
        )}
      </div>

      {/* Labels */}
      <div className="flex items-center gap-1 flex-wrap min-w-0">
        <TaskLabelBadges task={task} variant="full" />
      </div>

      {/* Project */}
      <div className="min-w-0 text-[13px] text-pm-text-muted truncate">
        {project || "—"}
      </div>

      {/* Assignee */}
      <div className="flex items-center -space-x-1.5 min-w-0">
        {assignees.length > 0 ? (
          assignees.slice(0, 3).map((u) => (
            <UserAvatar key={u.id || u.ID} user={u} size="md" className="border-2 border-background" />
          ))
        ) : (
          <span className="text-[13px] text-pm-text-muted">—</span>
        )}
      </div>

      {/* Due */}
      <div className={cn("flex items-center gap-1 text-[13px] min-w-0", overdue ? "text-red-500" : "text-pm-text-muted")}>
        {formatPmDate(task.due_date) ? (
          <>
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{formatPmDate(task.due_date)}</span>
            {overdue && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 shrink-0">
                {__('Overdue', 'wedevs-project-manager')}
              </Badge>
            )}
          </>
        ) : (
          <span>—</span>
        )}
      </div>
    </div>
  );
}
