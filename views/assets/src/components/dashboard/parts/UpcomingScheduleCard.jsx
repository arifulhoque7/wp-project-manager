import { __ } from '@wordpress/i18n'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CircleDot } from 'lucide-react'
import { Card } from '@components/ui/card'
import { CardHead, CardAction, EmptyState, ROW } from './CardShell'

// The API sends priority as a slug ('low' | 'medium' | 'high'), not the DB int.
const PRIORITY = {
  low:    'hsl(var(--muted-foreground))',
  medium: 'hsl(38 92% 55%)',
  high:   'hsl(0 72% 60%)',
}

export default function UpcomingScheduleCard({ items }) {
  const navigate = useNavigate()
  const list = items || []

  return (
    <Card className="rounded-xl p-5 border-pm-border flex flex-col">
      <CardHead
        icon={CalendarDays}
        title={__('Upcoming Tasks', 'wedevs-project-manager')}
        action={<CardAction onClick={() => navigate('/my-tasks')}>{__('My tasks', 'wedevs-project-manager')}</CardAction>}
      />

      {list.length === 0 ? (
        <EmptyState icon={CalendarDays}>{__('No upcoming tasks with a due date.', 'wedevs-project-manager')}</EmptyState>
      ) : (
        <div className="space-y-1">
          {list.map(t => (
            <button
              key={t.id}
              onClick={() => navigate(`/projects/${t.project_id}/task-lists/tasks/${t.id}`)}
              className={ROW}
            >
              <CircleDot className="w-4 h-4 shrink-0" style={{ color: PRIORITY[t.priority] ?? PRIORITY.medium }} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-pm-text-primary truncate">{t.title}</div>
                {t.project_title && (
                  <div className="text-[12px] text-pm-text-muted truncate">{t.project_title}</div>
                )}
              </div>
              {t.due_date && (
                <span className="text-[12px] text-pm-text-muted whitespace-nowrap shrink-0">{t.due_date}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
