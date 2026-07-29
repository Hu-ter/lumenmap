// Single source of truth for Hubble query SQL and their required parameters.
// Imported by production code (via TypeScript) and the smoke-test script.

export const TOP_ACCOUNTS_PER_TYPE = 70;
export const TOP_CONTRACT_LIMIT = 200;
export const TOP_SOROBAN_FUNCTIONS = 100;
export const TOP_CONTRACTS_PER_FUNCTION = 70;

export const ACCOUNT_QUERY_TYPES = [
  "payment",
  "path_payment_strict_receive",
  "path_payment_strict_send",
  "manage_buy_offer",
  "manage_sell_offer",
  "create_passive_sell_offer",
  "change_trust",
  "create_account",
  "liquidity_pool_deposit",
  "liquidity_pool_withdraw",
];

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

export const sorobanFunctionQuery = `
WITH labeled AS (
  SELECT
    CASE
      WHEN soroban_operation_type = 'invoke_contract'
        AND parameters_decoded[SAFE_OFFSET(1)].type = 'Sym'
      THEN parameters_decoded[SAFE_OFFSET(1)].value
      ELSE soroban_operation_type
    END AS function_name
  FROM \`crypto-stellar.crypto_stellar_dbt.enriched_history_operations_soroban\`
  WHERE closed_at BETWEEN @start AND @end
)
SELECT
  function_name,
  COUNT(*) AS op_count
FROM labeled
WHERE function_name IS NOT NULL AND function_name != ''
GROUP BY function_name
ORDER BY op_count DESC
LIMIT ${TOP_SOROBAN_FUNCTIONS}
`;

export const sorobanFunctionContractQuery = `
WITH aggregated AS (
  SELECT
    parameters_decoded[SAFE_OFFSET(1)].value AS function_name,
    contract_id,
    COUNT(*) AS op_count
  FROM \`crypto-stellar.crypto_stellar_dbt.enriched_history_operations_soroban\`
  WHERE closed_at BETWEEN @start AND @end
    AND soroban_operation_type = 'invoke_contract'
    AND parameters_decoded[SAFE_OFFSET(1)].type = 'Sym'
    AND contract_id IS NOT NULL
    AND contract_id != ''
  GROUP BY function_name, contract_id
),
ranked AS (
  SELECT
    function_name,
    contract_id,
    op_count,
    ROW_NUMBER() OVER (
      PARTITION BY function_name
      ORDER BY op_count DESC
    ) AS rank
  FROM aggregated
)
SELECT function_name, contract_id, op_count
FROM ranked
WHERE rank <= ${TOP_CONTRACTS_PER_FUNCTION}
ORDER BY function_name, op_count DESC
`;

export const accountMetadataQuery = `
SELECT
  account_id,
  home_domain
FROM \`crypto-stellar.crypto_stellar_dbt.accounts_current\`
WHERE account_id IN UNNEST(@ids)
  AND home_domain IS NOT NULL
  AND home_domain != ''
`;

/** @type {{ name: string, sql: string, requiredParams: string[] }[]} */
export const queryRegistry = [
  { name: "categoryQuery", sql: categoryQuery, requiredParams: ["start", "end"] },
  { name: "contractQuery", sql: contractQuery, requiredParams: ["start", "end"] },
  { name: "accountQuery", sql: accountQuery, requiredParams: ["start", "end", "types"] },
  { name: "sorobanFunctionQuery", sql: sorobanFunctionQuery, requiredParams: ["start", "end"] },
  { name: "sorobanFunctionContractQuery", sql: sorobanFunctionContractQuery, requiredParams: ["start", "end"] },
  { name: "accountMetadataQuery", sql: accountMetadataQuery, requiredParams: ["ids"] },
];