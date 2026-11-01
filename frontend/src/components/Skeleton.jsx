// Sharp-edged loading placeholder. Give it the same size classes as the thing it replaces
// so nothing moves when the real content arrives.
export default function Skeleton({ className = "", as: Tag = "div", children, ...rest }) {
  return (
    <Tag
      aria-hidden="true"
      className={`skeleton relative overflow-hidden rounded-none border border-white/[0.06] bg-[#0D0E12] ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Plain bar without a border, for text lines inside a skeleton block.
export function SkeletonBar({ className = "" }) {
  return <Skeleton className={`h-[0.8rem] ${className}`} />;
}

// Table style rows for the account and admin screens: title + meta line on the left, badge on the right.
export function SkeletonRows({ count = 3, label = "Loading" }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-phi-2 border-t border-line py-phi-2 first:border-t-0 first:pt-0"
        >
          <div className="min-w-0 flex-1">
            <Skeleton className="h-[1.2rem] w-2/5 max-w-[14rem]" />
            <Skeleton className="mt-[0.3rem] h-[0.8rem] w-3/5 max-w-[18rem]" />
          </div>
          <Skeleton className="h-[1.6rem] w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}
