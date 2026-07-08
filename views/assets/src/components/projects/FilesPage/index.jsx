import { __ } from '@wordpress/i18n';
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import BackButton from "@components/common/BackButton";
import { UserAvatar } from "@components/common/UserAvatar";
import { useApi } from "@hooks/useApi";
import { useToast } from "@hooks/useToast";
import { useConfirm } from "@hooks/useConfirm";
import { usePermissions } from "@hooks/usePermissions";
import { useCurrentProject } from "@hooks/useCurrentProject";
import { useProModal } from "@components/common/ProUpgradeModal";
import ProBadge from "@components/common/ProBadge";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Skeleton } from "@components/ui/skeleton";
import { cn } from "@lib/utils";
import {
  FileText,
  Download,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  FolderPlus,
  Upload,
  FilePlus,
  Link2,
  Link as LinkIcon,
  Search,
  ArrowUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { formatPmDate } from "@lib/pm-utils";
import {
  getFileIcon,
  getFileIconColor,
  getAttachedLabel,
  getAttachedURL,
  getDownloadPermissionUrl,
  checkPermissionAndDownload,
} from "./utils";

const FILES_GRID =
  "grid-cols-[minmax(220px,2.2fr)_100px_120px_minmax(140px,1.3fr)_minmax(190px,1.6fr)_150px]";

// Free FilesPage — read-only listing of files attached to tasks/discussions/comments.
// Pro plugin replaces this via registerFilter('route.files.element') with full
// folders/docs/links/comments/revisions UI.
export default function FilesPage() {
  const { projectId } = useParams();

  const api = useApi();
  const toast = useToast();
  const [ConfirmDialog, confirm] = useConfirm();
  const project = useCurrentProject(projectId);
  const { isPro, isManager, currentUserId } = usePermissions(project);
  // No delete_file capability exists — file delete is manager-or-creator (Vue
  // can_edit_file parity). The bogus userCan('delete_file') always returned false.
  const canDeleteFile = (f) => {
    if (isManager) return true;
    const creatorId = f?.creator?.data?.id ?? f?.created_by ?? f?.creator?.id;
    return currentUserId && creatorId && String(currentUserId) === String(creatorId);
  };
  const { setOpen: setProModalOpen } = useProModal();

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "uploaded", dir: "desc" });

  const fetchFiles = useCallback(() => {
    setLoading(true);
    api.get(`projects/${projectId}/files`, { per_page: 100 })
      .then((res) => setFiles(res?.data ?? res ?? []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [api, projectId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const proAction = () => setProModalOpen(true);

  const handleDelete = useCallback(async (id) => {
    const ok = await confirm(__("Are you sure?", 'wedevs-project-manager'), __("Delete File", 'wedevs-project-manager'));
    if (!ok) return;
    try {
      await api.post(`projects/${projectId}/files/${id}/delete`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success(__("File deleted", 'wedevs-project-manager'));
    } catch {
      toast.error(__("Failed to delete", 'wedevs-project-manager'));
    }
  }, [api, projectId, toast, __]);

  // Derive a flat, sortable/filterable row model from our real file data.
  const rows = useMemo(() => {
    const mapped = files.map((f) => {
      const iconType = f.mime_type || f.file_extension || f.type;
      const ext = String(f.file_extension || "").toUpperCase();
      return {
        raw: f,
        id: f.id,
        Icon: getFileIcon(iconType),
        iconColor: getFileIconColor(iconType),
        fileName: f.meta?.title || f.name || f.title || __("File", 'wedevs-project-manager'),
        typeLabel: ext || (f.type === "image" ? __("Image", 'wedevs-project-manager') : __("File", 'wedevs-project-manager')),
        uploaded: f.attached_at,
        uploadedTs: (() => {
          const d = new Date(f.attached_at?.date ?? f.attached_at ?? 0);
          return isNaN(d.getTime()) ? 0 : d.getTime();
        })(),
        attachedTo: getAttachedLabel(f, __),
        attachedUrl: getAttachedURL(f, projectId),
        creator: f.creator?.data ?? null,
        isImage: f.type === "image" || String(f.mime_type || "").startsWith("image"),
        thumbUrl: (f.type === "image" || String(f.mime_type || "").startsWith("image")) ? (f.thumb || f.url) : null,
        url: f.url,
      };
    });

    const filtered = mapped
      .filter((r) => tab === "all" || (r.creator && String(r.creator.id) === String(currentUserId)))
      .filter((r) => !query.trim() || r.fileName.toLowerCase().includes(query.trim().toLowerCase()));

    const dir = sort.dir === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "name": return a.fileName.localeCompare(b.fileName) * dir;
        case "type": return a.typeLabel.localeCompare(b.typeLabel) * dir;
        case "uploadedBy":
          return (a.creator?.display_name || "").localeCompare(b.creator?.display_name || "") * dir;
        case "uploaded":
        default:
          return (a.uploadedTs - b.uploadedTs) * dir;
      }
    });
    return sorted;
  }, [files, tab, query, sort, currentUserId, projectId, __]);

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const SortHead = ({ label, sortKey, className }) => (
    <button
      type="button"
      onClick={() => toggleSort(sortKey)}
      className={cn(
        "flex items-center gap-1 text-left transition-colors hover:text-pm-text-primary",
        sort.key === sortKey ? "text-pm-text-primary" : "text-pm-text-muted",
        className,
      )}
    >
      {label}
      <ArrowUpDown className="h-3 w-3 shrink-0 opacity-60" />
    </button>
  );

  const TABS = [
    { key: "all", label: __("All Files", 'wedevs-project-manager') },
    { key: "mine", label: __("My Files", 'wedevs-project-manager') },
  ];

  return (
    <>
    <ConfirmDialog />
    <div className="w-full p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <BackButton fallback={`/projects/${projectId}/task-lists`} />
          <div>
            <h1 className="text-xl font-bold text-pm-text-primary">{__("Files", 'wedevs-project-manager')}</h1>
            <p className="text-[13px] text-pm-text-muted">{__("Files attached to tasks, discussions and comments", 'wedevs-project-manager')}</p>
          </div>
          {files.length > 0 && (
            <span className="text-sm text-pm-text-muted bg-muted/60 px-2 py-0.5 rounded-md tabular-nums">
              {files.length}
            </span>
          )}
        </div>

        {!isPro && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="h-8 text-sm group/btn" onClick={proAction}>
              <FolderPlus className="h-4 w-4 mr-1" />{__("Create a folder", 'wedevs-project-manager')}
              <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity ml-1"><ProBadge /></span>
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-sm group/btn" onClick={proAction}>
              <Upload className="h-4 w-4 mr-1" />{__("Upload a file", 'wedevs-project-manager')}
              <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity ml-1"><ProBadge /></span>
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-sm group/btn" onClick={proAction}>
              <FilePlus className="h-4 w-4 mr-1" />{__("Create a doc", 'wedevs-project-manager')}
              <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity ml-1"><ProBadge /></span>
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-sm group/btn" onClick={proAction}>
              <Link2 className="h-4 w-4 mr-1" />{__("Link to Docs", 'wedevs-project-manager')}
              <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity ml-1"><ProBadge /></span>
            </Button>
          </div>
        )}
      </div>

      {/* Toolbar: tabs + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-pm-border bg-muted/60 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] font-medium transition-all",
                tab === t.key
                  ? "bg-background text-pm-text-primary shadow-sm"
                  : "text-pm-text-muted hover:text-pm-text-primary",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-pm-text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={__("Search files", 'wedevs-project-manager')}
            className="h-9 pl-8 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-card divide-y divide-border/50">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3"><Skeleton className="h-8 rounded-md" /></div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 rounded-lg border bg-card">
          <FileText className="h-14 w-14 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-pm-text-primary mb-1">
            {query.trim() || tab === "mine"
              ? __("No files match.", 'wedevs-project-manager')
              : __("No files yet.", 'wedevs-project-manager')}
          </h3>
          <p className="text-sm text-pm-text-muted">
            {__("Files attached to tasks, discussions, and comments will appear here.", 'wedevs-project-manager')}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Header */}
              <div className={cn("grid gap-3 px-4 py-2.5 bg-muted/30 border-b text-[12px] font-semibold uppercase tracking-wider", FILES_GRID)}>
                <SortHead label={__("File Name", 'wedevs-project-manager')} sortKey="name" />
                <SortHead label={__("Type", 'wedevs-project-manager')} sortKey="type" />
                <SortHead label={__("Uploaded", 'wedevs-project-manager')} sortKey="uploaded" />
                <span className="text-pm-text-muted">{__("Attached To", 'wedevs-project-manager')}</span>
                <SortHead label={__("Uploaded By", 'wedevs-project-manager')} sortKey="uploadedBy" />
                <span className="text-pm-text-muted text-right">{__("Action", 'wedevs-project-manager')}</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/50">
                {rows.map((r) => {
                  const { Icon } = r;
                  const handleDownload = () => checkPermissionAndDownload(
                    getDownloadPermissionUrl(r.raw, projectId),
                    r.url,
                    __,
                  );
                  return (
                    <div key={r.id} className={cn("grid gap-3 items-center px-4 py-3 hover:bg-muted/30 transition-colors group", FILES_GRID)}>
                      {/* File Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                          {r.thumbUrl ? (
                            <img src={r.thumbUrl} alt={r.fileName} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Icon className={cn("h-5 w-5", r.iconColor)} />
                          )}
                        </div>
                        <p className="text-sm font-medium text-pm-text-primary truncate">{r.fileName}</p>
                      </div>

                      {/* Type */}
                      <div className="min-w-0">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-pm-text-muted uppercase">
                          {r.typeLabel}
                        </span>
                      </div>

                      {/* Uploaded */}
                      <div className="text-[13px] text-pm-text-muted tabular-nums truncate">
                        {formatPmDate(r.uploaded, { month: "short", day: "numeric", year: "numeric" }) || "—"}
                      </div>

                      {/* Attached To */}
                      <div className="min-w-0 text-[13px]">
                        {r.attachedTo ? (
                          r.attachedUrl ? (
                            <a
                              href={r.attachedUrl}
                              className="inline-flex items-center gap-1 text-pm-accent hover:underline truncate"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              {r.attachedTo}
                            </a>
                          ) : (
                            <span className="text-pm-text-muted">{r.attachedTo}</span>
                          )
                        ) : (
                          <span className="text-pm-text-muted">—</span>
                        )}
                      </div>

                      {/* Uploaded By */}
                      <div className="flex items-center gap-2 min-w-0">
                        {r.creator ? (
                          <>
                            <UserAvatar user={r.creator} size="md" className="shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-pm-text-primary truncate">{r.creator.display_name}</p>
                              {r.creator.email && (
                                <p className="text-[12px] text-pm-text-muted truncate">{r.creator.email}</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-[13px] text-pm-text-muted">—</span>
                        )}
                      </div>

                      {/* Action */}
                      <div className="flex items-center justify-end gap-1">
                        {r.url && (
                          <Button variant="outline" size="sm" className="h-8 text-[13px]" onClick={handleDownload}>
                            <Download className="h-3.5 w-3.5 mr-1" />
                            {__("Download", 'wedevs-project-manager')}
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {r.url && (
                              <DropdownMenuItem onClick={handleDownload}>
                                <Download className="h-4 w-4 mr-2" />{__("Download", 'wedevs-project-manager')}
                              </DropdownMenuItem>
                            )}
                            {r.attachedUrl && (
                              <DropdownMenuItem onClick={() => { window.location.hash = r.attachedUrl.replace(/^#/, ''); }}>
                                <LinkIcon className="h-4 w-4 mr-2" />{__("Open parent", 'wedevs-project-manager')}
                              </DropdownMenuItem>
                            )}
                            {canDeleteFile(r.raw) && (
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(r.id)}>
                                <Trash2 className="h-4 w-4 mr-2" />{__("Delete", 'wedevs-project-manager')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
