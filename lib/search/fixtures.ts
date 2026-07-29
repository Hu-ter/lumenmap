import type { ActivityResponse } from "@/lib/types";
import { buildAllTreemaps } from "@/lib/entities/build-treemap";

/**
 * Fixture activity payload covering:
 * - duplicate labels (two "Aquarius Pool" contracts)
 * - same-code assets with different issuers (USDC)
 * - accounts, contracts, and protocols
 * - category nodes in both treemap views
 */
export function createSearchFixtures(): ActivityResponse {
  const labels = {
    GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN: {
      name: "Circle USDC",
      category: "issuer",
      protocol: "Circle",
    },
    GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5: {
      name: "Centre USDC (Testnet)",
      category: "issuer",
      protocol: "Centre",
    },
    GA5XIGA5C7QTPTWXQHY6MCJRMTRZDOSHR6EFIBNDQTCQHG262N4GGKTM: {
      name: "Kraken",
      category: "exchange",
      protocol: "Kraken",
    },
    CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2: {
      name: "Soroswap",
      category: "defi",
      protocol: "Soroswap",
    },
    CA2TZIB56KYKD46F7IFBF6XPO5TDNK6N2U6BRTGZ5AF4WUSBN6BKZMGF: {
      name: "Soroswap Pool",
      category: "defi",
      protocol: "Soroswap",
    },
    CA242XKXANKC46P53M355OPYWMHWPPTKQM5T5DNMOBWJMHOWDLNPJTN4: {
      name: "Aquarius Pool",
      category: "defi",
      protocol: "aqua.network",
    },
    CA262ONRV6P2IZPFVCTQNIU5XZIPZE4RLZNSOVJUNFUWDQR6MBNKS3IB: {
      name: "Aquarius Pool",
      category: "defi",
      protocol: "aqua.network",
    },
  };

  const categories = [
    { type_string: "payment", op_count: 5000 },
    { type_string: "path_payment_strict_send", op_count: 1200 },
    { type_string: "invoke_host_function", op_count: 8000 },
    { type_string: "manage_sell_offer", op_count: 900 },
    { type_string: "change_trust", op_count: 400 },
  ];

  const contracts = [
    {
      contract_id: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2",
      op_count: 3200,
    },
    {
      contract_id: "CA2TZIB56KYKD46F7IFBF6XPO5TDNK6N2U6BRTGZ5AF4WUSBN6BKZMGF",
      op_count: 2100,
    },
    {
      contract_id: "CA242XKXANKC46P53M355OPYWMHWPPTKQM5T5DNMOBWJMHOWDLNPJTN4",
      op_count: 1500,
    },
    {
      contract_id: "CA262ONRV6P2IZPFVCTQNIU5XZIPZE4RLZNSOVJUNFUWDQR6MBNKS3IB",
      op_count: 800,
    },
  ];

  const accounts = [
    {
      account_id: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      type_string: "payment",
      op_count: 2200,
    },
    {
      account_id: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      type_string: "payment",
      op_count: 400,
    },
    {
      account_id: "GA5XIGA5C7QTPTWXQHY6MCJRMTRZDOSHR6EFIBNDQTCQHG262N4GGKTM",
      type_string: "payment",
      op_count: 1800,
    },
    {
      account_id: "GA5XIGA5C7QTPTWXQHY6MCJRMTRZDOSHR6EFIBNDQTCQHG262N4GGKTM",
      type_string: "manage_sell_offer",
      op_count: 300,
    },
    {
      account_id: "GUNKNOWNACCOUNT111111111111111111111111111111111111111",
      type_string: "change_trust",
      op_count: 50,
    },
  ];

  const sorobanFunctions = [
    { function_name: "swap", op_count: 4000 },
    { function_name: "deposit", op_count: 2000 },
  ];

  const sorobanFunctionContracts = [
    {
      function_name: "swap",
      contract_id: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2",
      op_count: 2500,
    },
    {
      function_name: "swap",
      contract_id: "CA242XKXANKC46P53M355OPYWMHWPPTKQM5T5DNMOBWJMHOWDLNPJTN4",
      op_count: 1500,
    },
    {
      function_name: "deposit",
      contract_id: "CA2TZIB56KYKD46F7IFBF6XPO5TDNK6N2U6BRTGZ5AF4WUSBN6BKZMGF",
      op_count: 1200,
    },
    {
      function_name: "deposit",
      contract_id: "CA262ONRV6P2IZPFVCTQNIU5XZIPZE4RLZNSOVJUNFUWDQR6MBNKS3IB",
      op_count: 800,
    },
  ];

  const treemaps = buildAllTreemaps({
    categories,
    contracts,
    accounts,
    sorobanFunctions,
    sorobanFunctionContracts,
    labels,
  });

  return {
    period: "1d",
    start: "2026-07-29T00:00:00.000Z",
    end: "2026-07-29T23:59:59.999Z",
    source: "hubble",
    categories,
    contracts,
    accounts,
    sorobanFunctions,
    sorobanFunctionContracts,
    kpis: {
      totalOps: 15500,
      sorobanShare: 51.6,
      topCategory: "Soroban Contracts",
      activeContracts: contracts.length,
    },
    treemaps,
  };
}
