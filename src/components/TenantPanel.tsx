import { useEffect, useState } from "react";
import {
  getTenantId,
  isValidTenantId,
  setTenantId,
  subscribeTenantId,
} from "../lib/printix-tenant";

export function TenantPanel() {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(getTenantId());
    return subscribeTenantId(setValue);
  }, []);

  const valid = value === "" || isValidTenantId(value);

  return (
    <section
      aria-labelledby="tenant-heading"
      className="border-b border-border bg-background"
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="tenant-id"
            id="tenant-heading"
            className="text-xs font-medium text-foreground"
          >
            Printix tenant ID (UUID)
          </label>
          <input
            id="tenant-id"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setTenantId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            aria-invalid={!valid}
            className={
              "min-w-[22rem] flex-1 rounded-md border bg-background px-2 py-1.5 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30 " +
              (valid
                ? "border-input focus:border-ring"
                : "border-destructive focus:border-destructive")
            }
          />
          <span className="text-xs text-muted-foreground">
            Auto-fills the <code>tenantId</code> field in every API call below.
          </span>
        </div>
        {!valid && (
          <p className="mt-1 text-xs text-destructive">
            Not a valid UUID.
          </p>
        )}
      </div>
    </section>
  );
}
