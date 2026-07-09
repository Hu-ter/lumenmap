import {
  ACCOUNT_QUERY_TYPES,
  TOP_ACCOUNTS_PER_TYPE,
  TOP_CONTRACT_LIMIT,
} from "@/lib/constants";
import type { AccountRow, CategoryRow, ContractRow } from "@/lib/types";

export interface QueryParams {
  start: string;
  end: string;
}

export const categoryQuery = `
SELECT
  type_string,
  COUNT(*) AS op_count
FROM \`crypto-stellar.crypto_stellar_dbt.enriched_history_operations\`
WHERE closed_at BETWEEN @start AND @end
GROUP BY type_string
ORDER BY op_count DESC
`;

export const contractQuery = `
SELECT
  contract_id,
  SUM(txn_count) AS op_count
FROM \`crypto-stellar.crypto_stellar_dbt.hourly_soroban_fee_agg_contract\`
WHERE hour_agg BETWEEN @start AND @end
  AND contract_id IS NOT NULL
  AND contract_id != ''
GROUP BY contract_id
ORDER BY op_count DESC
LIMIT ${TOP_CONTRACT_LIMIT}
`;

export const accountQuery = `
WITH ranked AS (
  SELECT
    op_source_account AS account_id,
    type_string,
    COUNT(*) AS op_count,
    ROW_NUMBER() OVER (
      PARTITION BY type_string
      ORDER BY COUNT(*) DESC
    ) AS rank
  FROM \`crypto-stellar.crypto_stellar_dbt.enriched_history_operations\`
  WHERE closed_at BETWEEN @start AND @end
    AND type_string IN UNNEST(@types)
  GROUP BY account_id, type_string
)
SELECT account_id, type_string, op_count
FROM ranked
WHERE rank <= ${TOP_ACCOUNTS_PER_TYPE}
ORDER BY type_string, op_count DESC
`;

export function getAccountQueryTypes(): string[] {
  return ACCOUNT_QUERY_TYPES;
}

export type RawQueryResults = {
  categories: CategoryRow[];
  contracts: ContractRow[];
  accounts: AccountRow[];
};

export function mapCategoryRows(rows: Record<string, unknown>[]): CategoryRow[] {
  return rows.map((row) => ({
    type_string: String(row.type_string),
    op_count: Number(row.op_count),
  }));
}

export function mapContractRows(rows: Record<string, unknown>[]): ContractRow[] {
  return rows.map((row) => ({
    contract_id: String(row.contract_id),
    op_count: Number(row.op_count),
  }));
}

export function mapAccountRows(rows: Record<string, unknown>[]): AccountRow[] {
  return rows.map((row) => ({
    account_id: String(row.account_id),
    type_string: String(row.type_string),
    op_count: Number(row.op_count),
  }));
}
