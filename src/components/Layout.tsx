import type { ReactNode } from "react";

interface LayoutProps {
  actions: ReactNode;
  sidebar: ReactNode;
  list: ReactNode;
  detail: ReactNode;
}

export function Layout({ actions, sidebar, list, detail }: LayoutProps) {
  return (
    <div className="app-shell">
      <aside className="term-sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">SV</div>
          <div>
            <h1>Server Vault</h1>
            <p>Local profiles</p>
          </div>
        </div>
        {sidebar}
      </aside>
      <section className="server-list-panel">
        <header className="topbar">
          <div>
            <h2>Hosts</h2>
            <p>服务器资料库，支持 JSON 分享导入</p>
          </div>
          <nav className="topbar-actions">{actions}</nav>
        </header>
        {list}
      </section>
      <section className="detail-panel">{detail}</section>
    </div>
  );
}
