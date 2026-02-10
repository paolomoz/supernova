import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreview, type DeviceMode } from '@/lib/preview-store';

const devices: { mode: DeviceMode; icon: typeof Monitor; label: string }[] = [
  { mode: 'desktop', icon: Monitor, label: 'Desktop' },
  { mode: 'tablet', icon: Tablet, label: 'Tablet' },
  { mode: 'mobile', icon: Smartphone, label: 'Mobile' },
];

export function DeviceToggle() {
  const { deviceMode, setDeviceMode } = usePreview();

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
      {devices.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => setDeviceMode(mode)}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-sm transition-colors duration-100',
            deviceMode === mode
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
          title={label}
          aria-label={label}
          aria-pressed={deviceMode === mode}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
