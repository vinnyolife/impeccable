import { transformProvider } from './shared.js';

/**
 * Claude Code Transformer
 * Output: .claude/skills/{name}/SKILL.md
 */
export function transformClaudeCode(skills, distDir, patterns = null, options = {}) {
  transformProvider({
    provider: 'claude-code',
    displayName: 'Claude Code',
    configDir: '.claude',
    buildFrontmatter: (skill, skillName) => {
      const obj = { name: skillName, description: skill.description };
      if (skill.userInvokable) obj['user-invokable'] = true;
      if (skill.args && skill.args.length > 0) obj.args = skill.args;
      if (skill.license) obj.license = skill.license;
      if (skill.compatibility) obj.compatibility = skill.compatibility;
      if (skill.metadata) obj.metadata = skill.metadata;
      if (skill.allowedTools) obj['allowed-tools'] = skill.allowedTools;
      return obj;
    },
  }, skills, distDir, options);
}
