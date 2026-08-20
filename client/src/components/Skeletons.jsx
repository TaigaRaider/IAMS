export function Skeleton({ className = "", width, height, circle }) {
  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;
  return (
    <div
      className={`skeleton${circle ? " skeleton-circle" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="intcards">
      {[0, 1, 2, 3].map((i) => (
        <div className="intcard skeleton-card" key={i}>
          <div className="card-top">
            <Skeleton width="120px" height="12px" />
            <Skeleton width="36px" height="36px" />
          </div>
          <Skeleton width="64px" height="32px" />
        </div>
      ))}
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <>
      <StatCardsSkeleton />
      <div className="skeleton-cards-row">
        <div className="card skeleton-block">
          <Skeleton width="160px" height="16px" />
          <Skeleton width="100%" height="12px" />
          <Skeleton width="100%" height="12px" />
          <Skeleton width="70%" height="12px" />
        </div>
        <div className="card skeleton-block">
          <Skeleton width="200px" height="16px" />
          <Skeleton width="100%" height="12px" />
          <Skeleton width="100%" height="12px" />
        </div>
      </div>
    </>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="card table-card">
      <div className="skeleton-table-head">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="90px" height="12px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-table-row" key={i}>
          <div className="skeleton-table-id">
            <Skeleton circle width="36px" height="36px" />
            <Skeleton width="90px" height="18px" />
          </div>
          <Skeleton width="150px" height="18px" />
          <Skeleton width="110px" height="18px" />
          <Skeleton width="80px" height="18px" />
        </div>
      ))}
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="shell-skeleton">
      <div className="shell-skeleton-header">
        <Skeleton circle width="40px" height="40px" />
        <Skeleton width="120px" height="32px" />
        <div className="shell-skeleton-actions">
          <Skeleton circle width="38px" height="38px" />
          <Skeleton circle width="38px" height="38px" />
        </div>
      </div>
      <div className="shell-skeleton-body">
        <div className="shell-skeleton-sidebar">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="70%" height="42px" />
          ))}
          <Skeleton width="70%" height="42px" className="shell-skeleton-logout" />
        </div>
        <div className="shell-skeleton-content">
          <Skeleton width="220px" height="26px" />
          <StatCardsSkeleton />
          <div className="skeleton-cards-row">
            <div className="card skeleton-block">
              <Skeleton width="150px" height="16px" />
              <Skeleton width="100%" height="12px" />
              <Skeleton width="90%" height="12px" />
            </div>
            <div className="card skeleton-block">
              <Skeleton width="150px" height="16px" />
              <Skeleton width="100%" height="12px" />
              <Skeleton width="90%" height="12px" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
