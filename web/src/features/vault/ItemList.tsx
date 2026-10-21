import type { DecryptedVaultItem } from '@rejtek/core';
import { cx } from '../../lib/cx';
import { Avatar } from '../../ui/Avatar';
import { Card } from '../../ui/Card';
import { SearchIcon } from '../../ui/icons';

interface ItemListProps {
  items: readonly DecryptedVaultItem[];
  total: number;
  query: string;
  onQueryChange: (query: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ItemList({
  items,
  total,
  query,
  onQueryChange,
  selectedId,
  onSelect,
}: ItemListProps) {
  return (
    <Card className="min-w-0 flex-[1_1_320px] overflow-hidden">
      <div className="relative border-b border-line p-3">
        <label htmlFor="vault-search" className="sr-only">
          Search vault
        </label>
        <SearchIcon className="pointer-events-none absolute top-[27px] left-[26px] text-muted" />
        <input
          id="vault-search"
          type="search"
          autoFocus
          placeholder={`Search ${String(total)} items`}
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
          }}
          className="h-12 w-full rounded-[10px] border border-line bg-surface pr-3.5 pl-[42px] text-base text-ink outline-none focus:border-2 focus:border-accent"
        />
      </div>
      <div className="px-4 pt-2.5 pb-1.5 text-xs font-semibold tracking-wider text-muted uppercase">
        {query.trim() ? `${String(items.length)} of ${String(total)} match` : 'All items'}
      </div>
      {items.length === 0 ? (
        <p className="px-4 pb-5 text-sm text-muted">
          {total === 0 ? 'No items yet.' : 'Nothing matches your search.'}
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(item.id);
                }}
                aria-current={item.id === selectedId ? 'true' : undefined}
                className={cx(
                  'flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left',
                  item.id === selectedId
                    ? 'bg-accent-soft shadow-[inset_3px_0_0_var(--color-accent)]'
                    : 'hover:bg-field',
                )}
              >
                <Avatar name={item.data.name} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">{item.data.name}</span>
                  {item.data.username && (
                    <span className="truncate text-[13px] text-muted">{item.data.username}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
