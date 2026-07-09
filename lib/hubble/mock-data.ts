import type {
  AccountRow,
  CategoryRow,
  ContractRow,
  SorobanFunctionContractRow,
  SorobanFunctionRow,
} from "@/lib/types";

export function getMockActivityData(): {
  categories: CategoryRow[];
  contracts: ContractRow[];
  accounts: AccountRow[];
  sorobanFunctions: SorobanFunctionRow[];
  sorobanFunctionContracts: SorobanFunctionContractRow[];
} {
  return {
    categories: [
      { type_string: "invoke_host_function", op_count: 4_820_000 },
      { type_string: "payment", op_count: 2_140_000 },
      { type_string: "change_trust", op_count: 890_000 },
      { type_string: "manage_sell_offer", op_count: 620_000 },
      { type_string: "manage_buy_offer", op_count: 410_000 },
      { type_string: "path_payment_strict_send", op_count: 280_000 },
      { type_string: "create_account", op_count: 195_000 },
      { type_string: "set_options", op_count: 120_000 },
      { type_string: "liquidity_pool_deposit", op_count: 88_000 },
      { type_string: "account_merge", op_count: 42_000 },
    ],
    contracts: [
      {
        contract_id: "CBIELTK6Y5Y5U5DT5OMY7C5QZQZQZQZQZQZQZQZQZQZQZQZQ",
        op_count: 1_240_000,
      },
      {
        contract_id: "CBLENDPOOLBLENDPOOLBLENDPOOLBLENDPOOLBLENDPOOLBLEND",
        op_count: 980_000,
      },
      {
        contract_id: "CAQUARIUSDEXAQUARIUSDEXAQUARIUSDEXAQUARIUSDEXAQUAR",
        op_count: 640_000,
      },
      {
        contract_id: "CSOROSWAPSOROSWAPSOROSWAPSOROSWAPSOROSWAPSOROSWAP",
        op_count: 420_000,
      },
      {
        contract_id: "CPHOENIXPHOENIXPHOENIXPHOENIXPHOENIXPHOENIXPHOEN",
        op_count: 310_000,
      },
      {
        contract_id: "CSTELLARUSDCSTELLARUSDCSTELLARUSDCSTELLARUSDCST",
        op_count: 280_000,
      },
      {
        contract_id: "CVALUEMARTVALUEMARTVALUEMARTVALUEMARTVALUEMART",
        op_count: 210_000,
      },
      {
        contract_id: "CDEFINDEXCDEFINDEXCDEFINDEXCDEFINDEXCDEFINDEXCDEF",
        op_count: 180_000,
      },
      {
        contract_id: "CUNKNOWNCONTRACTUNKNOWNCONTRACTUNKNOWNCONTRACTUN",
        op_count: 560_000,
      },
    ],
    accounts: [
      {
        account_id: "GA5ZSEJYB37JRC5FFQI7QTYVHZV5J3C2TZL7Q5W5K3V5Y3Y3Y3Y3Y",
        type_string: "payment",
        op_count: 520_000,
      },
      {
        account_id: "GBMoneyGramMoneyGramMoneyGramMoneyGramMoneyGramM",
        type_string: "payment",
        op_count: 340_000,
      },
      {
        account_id: "GDKY2J7E3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3K3",
        type_string: "payment",
        op_count: 280_000,
      },
      {
        account_id: "GLOBSTRWALLETLOBSTRWALLETLOBSTRWALLETLOBSTRWALL",
        type_string: "payment",
        op_count: 190_000,
      },
      {
        account_id: "GDEXMARKETMAKERDEXMARKETMAKERDEXMARKETMAKERDEX",
        type_string: "manage_sell_offer",
        op_count: 320_000,
      },
      {
        account_id: "GDEXMARKETMAKERDEXMARKETMAKERDEXMARKETMAKERDEX",
        type_string: "manage_buy_offer",
        op_count: 210_000,
      },
      {
        account_id: "GANCHORWALLETANCHORWALLETANCHORWALLETANCHORWALL",
        type_string: "change_trust",
        op_count: 420_000,
      },
      {
        account_id: "GLOBSTRWALLETLOBSTRWALLETLOBSTRWALLETLOBSTRWALL",
        type_string: "change_trust",
        op_count: 180_000,
      },
      {
        account_id: "GBMoneyGramMoneyGramMoneyGramMoneyGramMoneyGramM",
        type_string: "path_payment_strict_send",
        op_count: 180_000,
      },
      {
        account_id: "GLOBSTRWALLETLOBSTRWALLETLOBSTRWALLETLOBSTRWALL",
        type_string: "path_payment_strict_send",
        op_count: 95_000,
      },
      {
        account_id: "GANCHORWALLETANCHORWALLETANCHORWALLETANCHORWALL",
        type_string: "path_payment_strict_receive",
        op_count: 120_000,
      },
      {
        account_id: "GA5ZSEJYB37JRC5FFQI7QTYVHZV5J3C2TZL7Q5W5K3V5Y3Y3Y3Y3Y",
        type_string: "path_payment_strict_receive",
        op_count: 51_000,
      },
      {
        account_id: "GLOBSTRWALLETLOBSTRWALLETLOBSTRWALLETLOBSTRWALL",
        type_string: "create_account",
        op_count: 95_000,
      },
      {
        account_id: "GDEXMARKETMAKERDEXMARKETMAKERDEXMARKETMAKERDEX",
        type_string: "liquidity_pool_deposit",
        op_count: 72_000,
      },
    ],
    sorobanFunctions: [
      { function_name: "swap", op_count: 1_420_000 },
      { function_name: "transfer", op_count: 980_000 },
      { function_name: "deposit", op_count: 640_000 },
      { function_name: "withdraw", op_count: 420_000 },
      { function_name: "harvest", op_count: 310_000 },
      { function_name: "upload_wasm", op_count: 50_000 },
    ],
    sorobanFunctionContracts: [
      {
        function_name: "swap",
        contract_id: "CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2",
        op_count: 820_000,
      },
      {
        function_name: "swap",
        contract_id: "CPHOENIXPHOENIXPHOENIXPHOENIXPHOENIXPHOENIXPHOEN",
        op_count: 600_000,
      },
      {
        function_name: "transfer",
        contract_id: "CSTELLARUSDCSTELLARUSDCSTELLARUSDCSTELLARUSDCST",
        op_count: 980_000,
      },
      {
        function_name: "deposit",
        contract_id: "CBLENDPOOLBLENDPOOLBLENDPOOLBLENDPOOLBLENDPOOLBLEND",
        op_count: 640_000,
      },
    ],
  };
}
