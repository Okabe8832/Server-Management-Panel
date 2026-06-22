export interface Host {
  id: string;
  name: string;
  address: string;
  port: number;
  username: string;
  password: string;
  group: string;
  tags: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultData {
  schema: 2;
  app: "local-server-vault";
  revision: number;
  updatedAt: string;
  hosts: Host[];
}

export type HostDraft = Omit<Host, "id" | "createdAt" | "updatedAt">;
