local M = {}

function M.plugins()
	local lazy_root = require("lazy.core.config").options.root
	local plugins = {}
	for _, plugin in pairs(require("lazy.core.config").plugins) do
		table.insert(plugins, {
			name = plugin.name,
			path = vim.fs.joinpath(lazy_root, plugin.name),
			url = plugin.url,
			lazy = plugin.lazy,
		})
	end
	return plugins
end

return M
