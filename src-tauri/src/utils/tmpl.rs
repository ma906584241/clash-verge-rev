pub const ITEM_LOCAL: &str = "# Profile Template for CraftVPN

proxies: []

proxy-groups: []

rules: []
";

pub const ITEM_MERGE: &str = "# Profile Enhancement Merge Template for CraftVPN

profile:
  store-selected: true
";

pub const ITEM_MERGE_EMPTY: &str = "# Profile Enhancement Merge Template for CraftVPN

";

pub const ITEM_SCRIPT: &str = "// Define main function (script entry)

function main(config, profileName) {
  return config;
}
";

pub const ITEM_RULES: &str = "# Profile Enhancement Rules Template for CraftVPN

prepend: []

append: []

delete: []
";

pub const ITEM_PROXIES: &str = "# Profile Enhancement Proxies Template for CraftVPN

prepend: []

append: []

delete: []
";

pub const ITEM_GROUPS: &str = "# Profile Enhancement Groups Template for CraftVPN

prepend: []

append: []

delete: []
";
