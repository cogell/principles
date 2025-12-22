import { Link } from 'react-router-dom';
import { formatRelativeTime, type PrincipleListItem } from '@principles/shared';

type PrincipleListProps = {
  items: PrincipleListItem[];
};

export function PrincipleList({ items }: PrincipleListProps) {
  return (
    <div className="grid gap-4">
      {items.map((item, index) => {
        const updatedLabel = formatRelativeTime(item.updated_at) ?? '--';
        const createdLabel = formatRelativeTime(item.created_at) ?? '--';

        return (
          <Link
            key={item.id}
            to={`/${item.slug}`}
            className="group rounded-3xl border border-border bg-card/80 p-5 shadow-card backdrop-blur transition hover:-translate-y-1 hover:border-accent/60 animate-rise"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-center">
              <div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-foreground">
                  {item.name}
                </h3>
                <p className="text-xs text-muted-foreground">/{item.slug}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>Updated {updatedLabel}</span>
              <span>Created {createdLabel}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
