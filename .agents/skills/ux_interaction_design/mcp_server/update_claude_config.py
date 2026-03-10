import json
import os

config_path = os.path.expanduser('~/Library/Application Support/Claude/claude_desktop_config.json')

with open(config_path, 'r') as f:
    config = json.load(f)

# Load env vars
env_vars = {}
with open('/Users/enyousun/Desktop/coding/.agents/skills/ux_interaction_design/mcp_server/.env', 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env_vars[k] = v

if 'mcpServers' not in config:
    config['mcpServers'] = {}

config['mcpServers']['legacy-atlassian'] = {
    'command': 'python3',
    'args': ['/Users/enyousun/Desktop/coding/.agents/skills/ux_interaction_design/mcp_server/server.py'],
    'env': env_vars
}

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print("✅ Successfully updated claude_desktop_config.json")
