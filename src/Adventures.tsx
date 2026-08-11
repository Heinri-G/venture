import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Eye,
  Globe,
  Loader2,
  Lock,
  Map as MapIcon,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './components/ui/alert-dialog';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Skeleton } from './components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { useAuthUser } from './lib/useAuthUser';
import {
  ADVENTURES_PAGE_SIZE,
  deleteAdventure,
  fetchAdventurePlaceCounts,
  fetchUserAdventures,
  formatRelativeTime,
  type Adventure,
  type AdventureVisibility,
  type AdventuresSortBy,
} from './lib/adventures';
import { cn } from './lib/utils';

interface AdventureCardData extends Adventure {
  placeCount: number;
}

const SORT_OPTIONS: { value: AdventuresSortBy; label: string }[] = [
  { value: 'recent', label: 'Recently created' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'places', label: 'Most places' },
];

const VISIBILITY_FILTERS: { value: AdventureVisibility | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'private', label: 'Private' },
  { value: 'shared', label: 'Shared' },
  { value: 'public', label: 'Public' },
];

const VISIBILITY_META: Record<AdventureVisibility, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  private: { label: 'Private', icon: Lock },
  shared: { label: 'Shared', icon: Users },
  public: { label: 'Public', icon: Globe },
};

function descriptionPreview(description: string | null): string | null {
  if (!description) return null;
  return description.length > 100 ? `${description.slice(0, 100)}…` : description;
}

export default function Adventures() {
  const { user } = useAuthUser();
  const navigate = useNavigate();

  const [adventures, setAdventures] = useState<AdventureCardData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [sortBy, setSortBy] = useState<AdventuresSortBy>('recent');
  const [filterVisibility, setFilterVisibility] = useState<AdventureVisibility | 'all'>('all');

  const [deleteTarget, setDeleteTarget] = useState<AdventureCardData | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setInitialLoading(true);
      setError(null);
      setHasMore(false);
      setPage(0);

      if (sortBy === 'places') {
        const { data, error: fetchError } = await fetchUserAdventures(user.id, {
          page: 0,
          pageSize: 1000,
          sortBy: 'recent',
        });
        if (cancelled) return;
        setInitialLoading(false);
        if (fetchError) {
          setError(fetchError);
          setAdventures([]);
          setTotalCount(0);
          return;
        }
        const filtered =
          filterVisibility === 'all'
            ? data
            : data.filter((a) => a.visibility === filterVisibility);
        const counts = await fetchAdventurePlaceCounts(filtered.map((a) => a.id));
        const sorted = filtered
          .map((a) => ({ ...a, placeCount: counts[a.id] ?? 0 }))
          .sort((a, b) => b.placeCount - a.placeCount);
        if (cancelled) return;
        setTotalCount(sorted.length);
        setAdventures(sorted.slice(0, ADVENTURES_PAGE_SIZE));
        setHasMore(sorted.length > ADVENTURES_PAGE_SIZE);
        return;
      }

      const { data, totalCount: count, error: fetchError } = await fetchUserAdventures(user.id, {
        page: 0,
        pageSize: ADVENTURES_PAGE_SIZE,
        sortBy,
      });
      if (cancelled) return;
      setInitialLoading(false);
      if (fetchError) {
        setError(fetchError);
        setAdventures([]);
        setTotalCount(0);
        return;
      }
      const filtered =
        filterVisibility === 'all'
          ? data
          : data.filter((a) => a.visibility === filterVisibility);
      const counts = await fetchAdventurePlaceCounts(filtered.map((a) => a.id));
      if (cancelled) return;
      setAdventures(filtered.map((a) => ({ ...a, placeCount: counts[a.id] ?? 0 })));
      setTotalCount(count ?? 0);
      setHasMore(filtered.length === ADVENTURES_PAGE_SIZE && filtered.length > 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, sortBy, filterVisibility, reloadKey]);

  const loadMore = useCallback(async () => {
    if (!user || loadingMore || !hasMore) return;

    if (sortBy === 'places') {
      setLoadingMore(true);
      const { data, totalCount: count, error: fetchError } = await fetchUserAdventures(user.id, {
        page: 0,
        pageSize: 1000,
        sortBy: 'recent',
      });
      if (fetchError) {
        setLoadingMore(false);
        toast.error('Could not load more adventures', { description: fetchError });
        return;
      }
      const filtered =
        filterVisibility === 'all'
          ? data
          : data.filter((a) => a.visibility === filterVisibility);
      const counts = await fetchAdventurePlaceCounts(filtered.map((a) => a.id));
      const sorted = filtered
        .map((a) => ({ ...a, placeCount: counts[a.id] ?? 0 }))
        .sort((a, b) => b.placeCount - a.placeCount);
      const nextPage = page + 1;
      setAdventures(sorted.slice(0, (nextPage + 1) * ADVENTURES_PAGE_SIZE));
      setTotalCount(count ?? sorted.length);
      setHasMore(sorted.length > (nextPage + 1) * ADVENTURES_PAGE_SIZE);
      setPage(nextPage);
      setLoadingMore(false);
      return;
    }

    const nextPage = page + 1;
    setLoadingMore(true);
    const { data, totalCount: count, error: fetchError } = await fetchUserAdventures(user.id, {
      page: nextPage,
      pageSize: ADVENTURES_PAGE_SIZE,
      sortBy,
    });
    setLoadingMore(false);
    if (fetchError) {
      toast.error('Could not load more adventures', { description: fetchError });
      return;
    }
    const filtered =
      filterVisibility === 'all'
        ? data
        : data.filter((a) => a.visibility === filterVisibility);
    const counts = await fetchAdventurePlaceCounts(filtered.map((a) => a.id));
    setAdventures((prev) => {
      const merged = [...prev];
      for (const item of filtered) {
        if (!merged.some((a) => a.id === item.id)) {
          merged.push({ ...item, placeCount: counts[item.id] ?? 0 });
        }
      }
      return merged;
    });
    setTotalCount(count ?? 0);
    setHasMore(filtered.length === ADVENTURES_PAGE_SIZE && filtered.length > 0);
    setPage(nextPage);
  }, [user, loadingMore, hasMore, page, sortBy, filterVisibility]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error: deleteError } = await deleteAdventure(deleteTarget.id);
    setDeleting(false);
    if (deleteError) {
      toast.error('Could not delete adventure', { description: deleteError });
      return;
    }
    setAdventures((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    setTotalCount((count) => Math.max(0, count - 1));
    setDeleteTarget(null);
    toast.success('Adventure deleted', { description: deleteTarget.title });
  }, [deleteTarget]);

  const handleShare = useCallback(async (adventure: AdventureCardData) => {
    if (adventure.visibility !== 'public') {
      toast.info('Sharing is coming soon', {
        description: 'Make this adventure public to get a shareable link.',
      });
      return;
    }
    const url = `${window.location.origin}/adventures/${adventure.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Public link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  }, []);

  if (!user) return null;

  const hasActiveFilters = sortBy !== 'recent' || filterVisibility !== 'all';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Adventures</h1>
          {totalCount > 0 && (
            <Badge variant="secondary" className="rounded-full">
              {totalCount}
            </Badge>
          )}
        </div>
        <Button asChild size="lg" className="rounded-full">
          <Link to="/adventures/new">
            <Plus />
            New adventure
          </Link>
        </Button>
      </div>

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as AdventuresSortBy)}>
            <SelectTrigger aria-label="Sort adventures" className="h-8 w-auto min-w-44 rounded-full">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent align="start">
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {VISIBILITY_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setFilterVisibility(filter.value)}
                aria-pressed={filterVisibility === filter.value}
                className={cn(
                  'h-8 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors',
                  filterVisibility === filter.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {totalCount > 0 && (
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              Showing {Math.min(adventures.length, totalCount)} of {totalCount}
            </span>
          )}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSortBy('recent');
              setFilterVisibility('all');
            }}
            className="w-fit text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p role="alert" className="text-sm font-medium text-destructive">
            Couldn&apos;t load your adventures.
          </p>
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)} className="rounded-full">
            Retry
          </Button>
        </div>
      ) : initialLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl" />
          ))}
        </div>
      ) : adventures.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bookmark className="size-6" />
          </span>
          <p className="font-heading text-lg font-semibold">No adventures yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Group your saved places into themed adventures — a trip, a city guide, a coffee crawl.
          </p>
          <Button asChild size="lg" className="rounded-full">
            <Link to="/adventures/new">
              <Plus />
              Create your first adventure
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {adventures.map((adventure) => {
              const meta = VISIBILITY_META[adventure.visibility];
              const Icon = meta.icon;
              return (
                <article
                  key={adventure.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
                >
                  <Link to={`/adventures/${adventure.id}`} className="flex flex-col">
                    {adventure.cover_photo_url ? (
                      <img
                        src={adventure.cover_photo_url}
                        alt=""
                        loading="lazy"
                        className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-primary/15 via-violet-600/10 to-sky-500/10 text-primary">
                        <MapIcon className="size-10" />
                      </div>
                    )}

                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="line-clamp-1 font-heading text-base font-semibold tracking-tight">
                          {adventure.title}
                        </h2>
                        <Badge variant="secondary" className="shrink-0 rounded-full">
                          <Icon className="size-3" />
                          {meta.label}
                        </Badge>
                      </div>

                      {descriptionPreview(adventure.description) && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {descriptionPreview(adventure.description)}
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Eye className="size-3.5 text-primary" />
                          {adventure.placeCount} {adventure.placeCount === 1 ? 'place' : 'places'}
                        </span>
                        <span>Updated {formatRelativeTime(adventure.updated_at)}</span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1 border-t border-border/60 px-2 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/adventures/${adventure.id}/edit`)}
                      className="flex-1 rounded-full"
                    >
                      <Pencil />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare(adventure)}
                      className="flex-1 rounded-full"
                    >
                      <Share2 />
                      Share
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(adventure)}
                      aria-label={`Delete ${adventure.title}`}
                      className="rounded-full text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-full sm:w-auto"
              >
                {loadingMore ? <Loader2 className="animate-spin" /> : null}
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the adventure and all {deleteTarget?.placeCount ?? ''} linked
              places. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-full">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting} className="rounded-full">
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {deleting ? 'Deleting...' : 'Delete adventure'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
