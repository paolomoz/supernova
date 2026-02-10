import { useRef, useEffect, useMemo } from 'react';
import { useSession } from '@/lib/session-store';
import { usePreview, DEVICE_WIDTHS } from '@/lib/preview-store';
import { getPreviewUrl } from '../../../shared/constants';

export function PreviewFrame() {
  const { org, repo, path, connected } = useSession();
  const { deviceMode, cacheBuster } = usePreview();
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewUrl = useMemo(() => {
    if (!connected || !org || !repo) return null;
    const pagePath = path.endsWith('.html') ? path.replace(/\.html$/, '') : path;
    return getPreviewUrl(org, repo, pagePath || '/');
  }, [org, repo, path, connected]);

  const urlWithBuster = previewUrl ? `${previewUrl}?t=${cacheBuster}` : null;

  const deviceWidth = DEVICE_WIDTHS[deviceMode];

  // Calculate scale to fit device width into container
  useEffect(() => {
    const container = containerRef.current;
    const iframe = iframeRef.current;
    if (!container || !iframe) return;

    const updateScale = () => {
      const containerWidth = container.clientWidth;
      const scale = Math.min(1, containerWidth / deviceWidth);
      iframe.style.width = `${deviceWidth}px`;
      iframe.style.height = `${Math.round(container.clientHeight / scale)}px`;
      iframe.style.transform = `scale(${scale})`;
      iframe.style.transformOrigin = 'top left';
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [deviceWidth]);

  if (!urlWithBuster) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <div>
          <p className="text-sm font-medium text-muted-foreground">No preview available</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Open a page in DA to see its preview here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-background-layer-2">
      <iframe
        ref={iframeRef}
        src={urlWithBuster}
        className="border-0"
        title="Page Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
