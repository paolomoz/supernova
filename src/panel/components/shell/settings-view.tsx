import { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsViewProps {
  onClose: () => void;
}

export function SettingsView({ onClose }: SettingsViewProps) {
  const [anthropicKey, setAnthropicKey] = useState('');
  const [daClientId, setDaClientId] = useState('');
  const [daClientSecret, setDaClientSecret] = useState('');
  const [daServiceToken, setDaServiceToken] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load existing settings
  useEffect(() => {
    chrome.storage.local.get(
      ['ANTHROPIC_API_KEY', 'DA_CLIENT_ID', 'DA_CLIENT_SECRET', 'DA_SERVICE_TOKEN'],
      (data) => {
        if (data.ANTHROPIC_API_KEY) setAnthropicKey(data.ANTHROPIC_API_KEY);
        if (data.DA_CLIENT_ID) setDaClientId(data.DA_CLIENT_ID);
        if (data.DA_CLIENT_SECRET) setDaClientSecret(data.DA_CLIENT_SECRET);
        if (data.DA_SERVICE_TOKEN) setDaServiceToken(data.DA_SERVICE_TOKEN);
      },
    );
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await chrome.storage.local.set({
      ANTHROPIC_API_KEY: anthropicKey,
      DA_CLIENT_ID: daClientId,
      DA_CLIENT_SECRET: daClientSecret,
      DA_SERVICE_TOKEN: daServiceToken,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground-heading">Settings</h2>
        <button
          onClick={onClose}
          className="rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          Done
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* AI Configuration */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-foreground-heading uppercase tracking-wider">AI Configuration</h3>
          <SettingsField
            label="Anthropic API Key"
            value={anthropicKey}
            onChange={setAnthropicKey}
            secret={!showSecrets}
            placeholder="sk-ant-..."
          />
        </section>

        {/* DA Credentials */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-foreground-heading uppercase tracking-wider">DA Credentials</h3>
          <SettingsField
            label="Client ID"
            value={daClientId}
            onChange={setDaClientId}
            placeholder="experience-catalyst-da-prod"
          />
          <SettingsField
            label="Client Secret"
            value={daClientSecret}
            onChange={setDaClientSecret}
            secret={!showSecrets}
            placeholder="p8e-..."
          />
          <SettingsField
            label="Service Token"
            value={daServiceToken}
            onChange={setDaServiceToken}
            secret={!showSecrets}
            placeholder="eyJhbGci..."
          />
        </section>

        {/* Show/hide secrets toggle */}
        <button
          onClick={() => setShowSecrets(!showSecrets)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {showSecrets ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {showSecrets ? 'Hide secrets' : 'Show secrets'}
        </button>
      </div>

      {/* Save button */}
      <div className="border-t border-border p-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition-colors duration-150',
            saved
              ? 'bg-positive text-positive-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
}

interface SettingsFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secret?: boolean;
}

function SettingsField({ label, value, onChange, placeholder, secret }: SettingsFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
      <input
        type={secret ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex h-8 w-full rounded-md border border-input bg-background-layer-2 px-2.5 py-1 text-xs transition-colors duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      />
    </div>
  );
}
