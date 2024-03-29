local M = {}

function M.plugins_action_data()
  local plugins = {}
  for _, plugin in pairs(require("lazy.core.config").plugins) do
    table.insert(plugins, { -- it forms ddu Item<FileActionData & {spec: string; lazy: boolean}>
      word = plugin[1],
      action = {
        name = plugin.name,
        path = plugin.dir,
        isDirectory = true,
        url = plugin.url,
        spec = plugin[1],
        lazy = plugin.lazy,
      },
    })
  end
  return plugins
end

return M
