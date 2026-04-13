import { ApiKeyManager } from "@/components/ApiKeyManager";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your YouTube API keys and quota usage. The system will auto-rotate through active keys.
        </p>
      </div>
      <ApiKeyManager />
    </div>
  );
}
