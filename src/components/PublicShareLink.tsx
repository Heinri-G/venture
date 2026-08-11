import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, RefreshCw, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';

interface PublicShareLinkProps {
  url: string;
  /** Title used for the native share dialog, if available. */
  title?: string;
  /** When provided, a "Regenerate link" action is shown. */
  onRegenerate?: () => Promise<void> | void;
  /** Children render a small preview of what recipients will see. */
  children?: React.ReactNode;
}

export default function PublicShareLink({
  url,
  title,
  onRegenerate,
  children,
}: PublicShareLinkProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied', { description: 'Anyone with this link can view the adventure.' });
    } catch {
      toast.error('Could not copy the link', {
        description: 'Select the URL below and copy it manually.',
      });
    }
  }, [url]);

  const handleShare = useCallback(async () => {
    if (!navigator.share) {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({ title, url });
    } catch {
      // User dismissed the share sheet — no-op.
    }
  }, [title, url, handleCopy]);

  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate) return;
    setRegenerating(true);
    try {
      await onRegenerate();
      toast.success('Link regenerated', {
        description: 'The old link no longer works.',
      });
    } catch {
      toast.error('Could not regenerate the link');
    } finally {
      setRegenerating(false);
    }
  }, [onRegenerate]);

  return (
    <div className="flex flex-col gap-3">
      <Label className="text-sm font-semibold text-foreground">
        Public link
      </Label>

      {children}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            readOnly
            value={url}
            aria-label="Public share link"
            onFocus={(e) => e.target.select()}
            className="h-9 rounded-full pr-9 font-mono text-xs"
          />
          <span
            className={cn(
              'pointer-events-none absolute right-3 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-primary',
              copied ? 'opacity-100' : 'opacity-0 transition-opacity'
            )}
            aria-hidden
          >
            <Check className="size-4" />
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          aria-label="Copy public link to clipboard"
          className="shrink-0 rounded-full"
        >
          {copied ? <Check /> : <Copy />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleShare}
          className="rounded-full"
        >
          <Share2 />
          Share via…
        </Button>
        <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink />
            Open link
          </a>
        </Button>
        {onRegenerate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="rounded-full text-muted-foreground"
          >
            <RefreshCw className={cn(regenerating && 'animate-spin')} />
            Regenerate
          </Button>
        )}
      </div>
    </div>
  );
}
