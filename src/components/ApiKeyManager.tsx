"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash, RefreshCcw, ArrowUp, ArrowDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type KeyData = {
  id: string;
  label: string;
  maskedKey: string;
  priority: number;
  isActive: boolean;
  quotaUsed: number;
};

export function ApiKeyManager() {
  const [keys, setKeys] = useState<KeyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setKeys(data);
      } else {
        toast.error(data.error || "Failed to load keys");
        setKeys([]);
      }
    } catch (err) {
      toast.error("Error fetching keys");
      setKeys([]);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel, key: newKeyValue })
      });
      
      if (res.ok) {
        toast.success("Key successfully added and verified");
        setNewLabel("");
        setNewKeyValue("");
        fetchKeys();
      } else {
        try {
          const error = await res.json();
          toast.error(error.error || "Failed to add key");
        } catch {
          toast.error(`Error: ${res.status} ${res.statusText}`);
        }
      }
    } catch (err) {
      toast.error("Network or server error while adding key");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    fetchKeys();
    toast.success("Key deleted");
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    await fetch(`/api/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentStatus })
    });
    fetchKeys();
  };

  const incrementPriority = async (id: string, p: number) => {
    await fetch(`/api/keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: p + 1 })
    });
    fetchKeys();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Key</CardTitle>
          <CardDescription>Get this from your Google Cloud Console (YouTube Data API v3 enabled).</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddKey} className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Label (e.g. "Personal Account")</Label>
              <Input required value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="My Key 1" />
            </div>
            <div className="space-y-2 flex-1">
              <Label>API Key</Label>
              <Input required type="password" value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} placeholder="AIzaSy..." />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Add Key"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-medium">Active Keys</h3>
        {keys.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground border border-dashed rounded-md bg-card">
            No keys configured. Please add one above.
          </div>
        ) : (
          keys.map(k => (
            <Card key={k.id} className={!k.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{k.label}</span>
                    <Badge variant={k.isActive ? "default" : "secondary"}>
                      {k.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="text-sm font-mono text-muted-foreground">{k.maskedKey}</div>
                  
                  <div className="mt-4 max-w-sm">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Quota used today</span>
                      <span>{k.quotaUsed} / 10000</span>
                    </div>
                    <Progress value={(k.quotaUsed / 10000) * 100} indicatorClass={k.quotaUsed > 9000 ? "bg-red-500" : "bg-primary"} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center mr-4">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => incrementPriority(k.id, k.priority)}>
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <span className="text-xs font-mono">P:{k.priority}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => incrementPriority(k.id, k.priority - 2)}>
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <Button variant="secondary" onClick={() => toggleActive(k.id, k.isActive)}>
                    {k.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(k.id)}>
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
