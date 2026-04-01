Scaffold a new table operation modal component for ClickHouse Owl.

Ask the user for:
1. The operation name (e.g. `Export`, `Partition`, `Optimize`)
2. What inputs the user needs to provide
3. What API endpoint it calls

Then create `components/<OperationName>TableModal.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Modal, Button, Input } from "@/components/ui";

interface <OperationName>TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  database: string;
  onSuccess?: () => void;
}

export default function <OperationName>TableModal({
  isOpen,
  onClose,
  tableName,
  database,
  onSuccess,
}: <OperationName>TableModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/...", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableName, database }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="<OperationName> Table">
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {/* form inputs here */}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Processing..." : "<OperationName>"}
        </Button>
      </div>
    </Modal>
  );
}
```

Rules:
- Always use `components/ui` primitives (Modal, Button, Input) — never raw HTML equivalents
- Always show loading state during async operations
- Always display error messages from the API response
- Call `onSuccess?.()` before `onClose()` on success so parent can refresh data
