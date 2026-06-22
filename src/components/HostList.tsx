import type { Host } from "../types/vault";

interface HostListProps {
  hosts: Host[];
  selectedId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (host: Host) => void;
}

export function HostList({ hosts, selectedId, search, onSearchChange, onSelect }: HostListProps) {
  return (
    <div className="list-wrap">
      <input
        className="search-input"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search by name, IP, username, tag, note"
      />
      <div className="host-list">
        {hosts.length === 0 ? (
          <div className="empty-state">没有匹配的服务器。</div>
        ) : (
          hosts.map((host) => (
            <button
              type="button"
              key={host.id}
              className={`host-row ${host.id === selectedId ? "selected" : ""}`}
              onClick={() => onSelect(host)}
            >
              <span className="server-avatar">{host.name.slice(0, 2).toUpperCase()}</span>
              <span className="server-main">
                <strong>{host.name}</strong>
                <small>{host.username ? `${host.username}@` : ""}{host.address}:{host.port}</small>
              </span>
              <span className="server-status">{host.password ? "Password" : "No password"}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
