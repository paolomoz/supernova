import { Globe, RefreshCw, ExternalLink } from 'lucide-react';
import { useSession } from '@/lib/session-store';
import { usePreview } from '@/lib/preview-store';
import { DeviceToggle } from '../preview/device-toggle';

export function PreviewChrome() {
  const { org, repo, path, connected } = useSession();
  const { refresh } = usePreview();

  return (
    <div className="flex items-center justify-between border-b border-border bg-background-layer-2 px-3 py-1.5">
      <div className="flex items-center gap-2">
        <DeviceToggle />
        {connected && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
            {org}/{repo}{path}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={refresh}
          className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-100 hover:bg-accent hover:text-foreground"
          title="Refresh preview"
          aria-label="Refresh preview"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
        {connected && (
          <button
            onClick={() => {
              window.open(`https://main--${repo}--${org}.aem.page${path}`, '_blank');
            }}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-100 hover:bg-accent hover:text-foreground"
            title="Open in new tab"
            aria-label="Open preview in new tab"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
        {!connected && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Globe className="h-3 w-3" />
            <span>Not connected</span>
          </div>
        )}
      </div>
    </div>
  );
}
