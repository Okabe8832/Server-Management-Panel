import type { Host } from "../types/vault";

interface HostDetailProps {
  host: Host | null;
  revealPasswords: boolean;
  onSsh: (host: Host) => void;
  onCopy: (value: string, label: string) => void;
  onEdit: (host: Host) => void;
  onDelete: (host: Host) => void;
}

function SecretValue({ value, reveal }: { value: string; reveal: boolean }) {
  if (!value) return <span className="muted">未填写</span>;
  return <span className="secret-value">{reveal ? value : "••••••••••••"}</span>;
}

export function HostDetail({ host, revealPasswords, onSsh, onCopy, onEdit, onDelete }: HostDetailProps) {
  if (!host) {
    return <div className="empty-state detail-empty">选择一个服务器查看详情。</div>;
  }

  return (
    <div className="detail-content">
      <header className="detail-hero">
        <div className="large-avatar">{host.name.slice(0, 2).toUpperCase()}</div>
        <div>
          <h2>{host.name}</h2>
          <p>{host.group || "Personal"} · {host.address}:{host.port}</p>
        </div>
      </header>

      <div className="detail-actions">
        <button type="button" className="primary" onClick={() => onSsh(host)}>SSH</button>
        <button type="button" className="primary" onClick={() => onEdit(host)}>编辑</button>
        <button type="button" onClick={() => onCopy(host.address, "IP / 地址")}>复制地址</button>
        <button type="button" onClick={() => onCopy(host.username, "用户名")} disabled={!host.username}>复制用户名</button>
        <button type="button" onClick={() => onCopy(host.password, "密码")} disabled={!host.password}>复制密码</button>
        <button type="button" className="danger" onClick={() => onDelete(host)}>删除</button>
      </div>

      <section className="detail-section">
        <h3>Connection Profile</h3>
        <dl className="detail-grid">
          <dt>服务器名称</dt>
          <dd>{host.name}</dd>
          <dt>IP / 域名</dt>
          <dd>{host.address}</dd>
          <dt>端口</dt>
          <dd>{host.port}</dd>
          <dt>登录名</dt>
          <dd>{host.username || <span className="muted">未填写</span>}</dd>
          <dt>密码</dt>
          <dd><SecretValue value={host.password} reveal={revealPasswords} /></dd>
        </dl>
      </section>

      <section className="detail-section">
        <h3>Organization</h3>
        <dl className="detail-grid">
          <dt>分组</dt>
          <dd>{host.group || <span className="muted">未分组</span>}</dd>
          <dt>标签</dt>
          <dd className="tag-row">
            {host.tags.length > 0 ? host.tags.map((tag) => <em key={tag}>{tag}</em>) : <span className="muted">无标签</span>}
          </dd>
          <dt>备注</dt>
          <dd>{host.note || <span className="muted">无备注</span>}</dd>
        </dl>
      </section>

      <p className="security-note">导出的 JSON 会包含密码，请只分享给可信对象。</p>
    </div>
  );
}
