local M = {}

function M.plugins_action_data()
  local lazy_root = require("lazy.core.config").options.root
  local plugins = {}
  for _, plugin in pairs(require("lazy.core.config").plugins) do
    table.insert(plugins, { -- it forms ddu Item<FileActionData & {lazy: boolean}>
      word = plugin.name,
      action = {
        name = plugin.name,
        path = vim.fs.joinpath(lazy_root, plugin.name),
        isDirectory = true,
        url = plugin.url,
        lazy = plugin.lazy,
      },
    })
  end
  return plugins
end

return M
