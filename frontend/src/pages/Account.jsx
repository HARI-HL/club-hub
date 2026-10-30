import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashShell from "./DashShell.jsx";
import Notice from "../components/Notice.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import SpotlightCard from "../components/SpotlightCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import { describeError, formatDateTime } from "../utils/errors.js";

const SLOTS = [
  ["technical", "TECHNICAL"],
  ["non_technical", "NON-TECHNICAL"],
];

function Panel({ code, title, children, className = "" }) {
  return (
    <SpotlightCard as="section" className={`p-phi-3 lg:p-phi-4 ${className}`}>
      <p className="meta">{code}</p>
      <h2 className="mt-[0.4rem] text-lg font-bold">{title}</h2>
      <div className="mt-phi-3">{children}</div>
    </SpotlightCard>
  );
}

const Empty = ({ children }) => <p className="text-base text-muted">{children}</p>;

export default function Account() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    api.me
      .overview()
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(describeError(err)));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <DashShell
      eyebrow={`Account / ${user?.role ? user.role.replace("_", " ") : ""}`}
      title={user?.name ? `${user.name}.` : "Your account."}
      intro={user?.email ? `Signed in as ${user.email}.` : undefined}
    >
      {error && (
        <Notice tone="error" title="Could not load your overview">
          {error}
        </Notice>
      )}

      {!error && !data && (
        <div aria-busy="true" className="grid grid-cols-1 gap-phi-3 lg:grid-cols-golden">
          <div className="h-64 animate-pulse border border-line bg-surface" />
          <div className="h-64 animate-pulse border border-line bg-surface" />
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-phi-3 lg:grid-cols-golden lg:gap-phi-4">
          {/* 38%: the category slots, first on phones */}
          <Panel code="01 / My clubs" title="Category slots" className="order-first lg:order-none lg:col-start-2 lg:row-start-1 lg:self-start">
            <ul className="flex flex-col gap-phi-2">
              {SLOTS.map(([category, label]) => {
                const m = data.memberships.find((x) => x.category === category);
                return (
                  <li key={category} className="border border-line p-phi-2">
                    <div className="flex items-center justify-between gap-phi-2">
                      <span className="meta text-ink">[{label}]</span>
                      <span className={`meta ${m ? "text-accent" : ""}`}>{m ? "[SLOT: FILLED]" : "[SLOT: OPEN]"}</span>
                    </div>
                    {m ? (
                      <>
                        <p className="mt-phi-1 text-lg font-bold">{m.club}</p>
                        <p className="meta mt-[0.2rem]">Joined {formatDateTime(m.joined_at)}</p>
                      </>
                    ) : (
                      <p className="mt-phi-1 text-base text-muted">
                        Not in a {label.toLowerCase()} club yet.{" "}
                        <Link to="/#domains" className="text-accent underline underline-offset-4">
                          Browse clubs
                        </Link>
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="meta mt-phi-2">[RULE: 1 CLUB MAX PER CATEGORY]</p>
          </Panel>

          <div className="flex flex-col gap-phi-3 lg:col-start-1 lg:row-start-1 lg:gap-phi-4">
            <Panel code="02 / Applications" title="My applications">
              {data.applications.length === 0 ? (
                <Empty>You have not applied to any club yet.</Empty>
              ) : (
                <ul>
                  {data.applications.map((a, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-phi-2 border-t border-line py-phi-2 first:border-t-0 first:pt-0">
                      <div>
                        <p className="text-base font-semibold">{a.club}</p>
                        <p className="meta mt-[0.2rem]">Applied {formatDateTime(a.applied_at)}</p>
                      </div>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel code="03 / Events" title="My registered events">
              {data.events.length === 0 ? (
                <Empty>
                  No seats reserved yet.{" "}
                  <Link to="/#events" className="text-accent underline underline-offset-4">
                    See upcoming events
                  </Link>
                </Empty>
              ) : (
                <ul>
                  {data.events.map((e, i) => (
                    <li key={i} className="border-t border-line py-phi-2 first:border-t-0 first:pt-0">
                      <p className="text-base font-semibold">{e.title}</p>
                      <p className="meta mt-[0.2rem]">
                        {formatDateTime(e.starts_at)}
                        {e.venue ? ` / ${e.venue}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </DashShell>
  );
}
