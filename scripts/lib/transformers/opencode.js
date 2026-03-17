import { transformProvider } from './shared.js';

/**
 * OpenCode Transformer
 * Output: .opencode/skills/{name}/SKILL.md
 */
export function transformOpenCode(skills, distDir, patterns = null, options = {}) {
  transformProvider({
    provider: 'opencode',
    displayName: 'OpenCode',
    configDir: '.opencode',
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
