import { searchItems } from '@rejtek/core';
import { useMemo, useState } from 'react';
import { Alert, Button, Card, PlusIcon } from '@rejtek/ui';
import { ItemDetail } from './ItemDetail';
import { ItemEditor } from './ItemEditor';
import { ItemList } from './ItemList';
import { vaultErrorMessage } from './messages';
import { useVaultItems } from './useVault';

type Panel = { mode: 'view' | 'edit'; id: string } | { mode: 'new' } | null;

export function VaultPage() {
  const vault = useVaultItems();
  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<Panel>(null);

  const items = useMemo(() => vault.data ?? [], [vault.data]);
  const results = useMemo(() => searchItems(items, query), [items, query]);
  const selectedId = panel && panel.mode !== 'new' ? panel.id : null;
  const selected = items.find((item) => item.id === selectedId);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Vault</h1>
          <p className="mt-1 text-sm text-muted">
            {vault.isSuccess ? `${String(items.length)} items · ` : ''}encrypted in this browser
          </p>
        </div>
        <Button
          onClick={() => {
            setPanel({ mode: 'new' });
          }}
        >
          <PlusIcon size={16} />
          New item
        </Button>
      </div>

      {vault.isError && <Alert tone="danger">{vaultErrorMessage(vault.error)}</Alert>}

      <div className="flex flex-wrap items-start gap-5">
        <ItemList
          items={results}
          total={items.length}
          query={query}
          onQueryChange={setQuery}
          selectedId={selectedId}
          onSelect={(id) => {
            setPanel({ mode: 'view', id });
          }}
        />
        {panel?.mode === 'new' && (
          <ItemEditor
            key="new"
            onSaved={(id) => {
              setPanel({ mode: 'view', id });
            }}
            onCancel={() => {
              setPanel(null);
            }}
          />
        )}
        {panel?.mode === 'edit' && selected && (
          <ItemEditor
            key={selected.id}
            item={selected}
            onSaved={(id) => {
              setPanel({ mode: 'view', id });
            }}
            onCancel={() => {
              setPanel({ mode: 'view', id: selected.id });
            }}
          />
        )}
        {panel?.mode === 'view' && selected && (
          <ItemDetail
            key={selected.id}
            item={selected}
            onEdit={() => {
              setPanel({ mode: 'edit', id: selected.id });
            }}
            onDeleted={() => {
              setPanel(null);
            }}
          />
        )}
        {!panel && (
          <Card className="hidden min-w-0 flex-[999_1_480px] p-7 text-sm text-muted md:block">
            {vault.isPending ? 'Decrypting your vault…' : 'Select an item to see its details.'}
          </Card>
        )}
      </div>
    </>
  );
}
