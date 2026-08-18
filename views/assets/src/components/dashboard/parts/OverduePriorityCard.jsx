import { __, sprintf, _n } from '@wordpress/i18n'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card } from '@components/ui/card'
import { Badge } from '@components/ui/badge'
import { cn } from '@lib/utils'
import { CardHead, EmptyState, ROW } from './CardShell'

const PRIORITY_DOT = {
  high:   'bg-rose-500',
  medium: 'bg-amber-500',
  low:    'bg-pm-text-muted/50',
}

export default function OverduePriorityCard({ items }) {
  const navigate = useNavigate()
  const list = items || []

  return (
    <Card className="rounded-xl p-5 border-pm-border flex flex-col h-full">
      <CardHead icon={AlertTriangle} iconClassName="text-rose-500" title={__('Overdue & Priority', 'wedevs-project-manager')} />

      {list.length === 0 ? (
        <EmptyState icon={CheckCircle2} tone="positive">{__('Nothing overdue — great work!', 'wedevs-project-manager')}</EmptyState>
      ) : (
        <div className="space-y-1 flex-1 min-h-0 overflow-y-auto pm-sidebar-scroll pr-1">
          {list.map(t => (
            <button
              key={t.id}
              onClick={() => navigate(`/projects/${t.project_id}/task-lists/tasks/${t.id}`)}
              className={ROW}
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_DOT[t.priority] || PRIORITY_DOT.medium)} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-pm-text-primary truncate">{t.title}</div>
                {t.project_title && <div className="text-[12px] text-pm-text-muted truncate">{t.project_title}</div>}
              </div>
              <Badge variant="outline" className="shrink-0 text-[11px] text-rose-600 border-rose-200 bg-rose-50">
                {sprintf( _n( '%dd', '%dd', t.days_overdue, 'wedevs-project-manager' ), t.days_overdue )}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
