import { expose } from "threads/worker";
import { BalancesInterface, VaultInterface } from "../daogarden-js/faces";

const worker = {
  sortHoldersByBalance: (balances: BalancesInterface, vault: VaultInterface) => {
    const holders: Map<string, {address: string, balance: number, vaultBalance: number}> = new Map();

    const users = Object.keys(balances);
    users.forEach((u) => {
      holders.set(u, {address: u, balance: balances[u], vaultBalance: 0});
    });

    const vaultUsers = Object.keys(vault);
    vaultUsers.forEach((u) => {
      let total = vault[u].map(a => a.balance).reduce((a, b) => a + b, 0);

      let holder = {
        address: u,
        balance: total,
        vaultBalance: total
      };
      if(holders.get(u)) {
        holder = holders.get(u);
        holder.vaultBalance = total;
        holder.balance += total;
      }
      holders.set(u, holder);
    });

    const res = Array.from(holders).map(a => a[1]).sort((a, b) => a.balance - b.balance);
    return res;
  }
}

export type TokensWorker = typeof worker;
expose(worker);